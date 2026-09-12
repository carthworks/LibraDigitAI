from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
import os
import sys
import json
import io
from datetime import datetime, timedelta
import pytesseract
from PIL import Image
import PyPDF2
import mimetypes
import fitz # PyMuPDF
from deep_translator import GoogleTranslator
from metadata_extractor import extract_metadata
from batch_processor import BatchProcessor
from advanced_ocr_processor import AdvancedOCRProcessor
from handwritten_to_pdf import HandwrittenToPDFConverter
from glm_ocr_processor import GlmOcrProcessor, check_ollama_status


app = Flask(__name__)
CORS(app)

# Configuration
if getattr(sys, 'frozen', False):
    # If the application is run as a bundle, the PyInstaller bootloader
    # extends the sys module by a flag frozen=True and sets the app 
    # path into variable _MEIPASS'.
    # For one-file bunding, we might want to use the executable dir for data
    BASE_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE = os.path.join(BASE_DIR, 'libradigit.db')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ARCHIVE_FOLDER = os.path.join(BASE_DIR, 'Archive')

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ARCHIVE_FOLDER, exist_ok=True)

# Database initialization
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT,
            status TEXT DEFAULT 'upload',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Files table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            original_path TEXT,
            ocr_path TEXT,
            cleaned_path TEXT,
            final_path TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    ''')
    
    # Metadata table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            title TEXT,
            author TEXT,
            year TEXT,
            subject TEXT,
            keywords TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    ''')
    
    # OCR text table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ocr_text (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            original_text TEXT,
            cleaned_text TEXT,
            confidence_data TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    ''')
    
    # Migration: Add confidence_data if not exists
    try:
        cursor.execute('ALTER TABLE ocr_text ADD COLUMN confidence_data TEXT')
    except sqlite3.OperationalError:
        pass # Column likely already exists

    # Batch jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS batch_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            total_files INTEGER DEFAULT 0,
            processed_files INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        )
    ''')
    
    # Batch items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS batch_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    
    # Metadata suggestions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metadata_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            suggested_title TEXT,
            suggested_author TEXT,
            suggested_year TEXT,
            suggested_subject TEXT,
            suggested_keywords TEXT,
            confidence_scores TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    
    # App Configuration table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # FTS5 Search Index
    cursor.execute('CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(project_id, title, author, content, keywords, tokenize="porter")')

    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON batch_items(batch_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_items_project_id ON batch_items(project_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_project_id ON metadata_suggestions(project_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status)')
    
    conn.commit()
    conn.close()

# Helper function to get database connection
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Helper function to get project with all data
def get_project_data(project_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get project
    cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        return None
    
    project_dict = dict(project)
    
    # Get files
    cursor.execute('SELECT * FROM files WHERE project_id = ?', (project_id,))
    files = cursor.fetchone()
    if files:
        project_dict['files'] = dict(files)
    
    # Get metadata
    cursor.execute('SELECT * FROM metadata WHERE project_id = ?', (project_id,))
    metadata = cursor.fetchone()
    if metadata:
        project_dict['metadata'] = dict(metadata)
    
    # Get OCR text
    cursor.execute('SELECT * FROM ocr_text WHERE project_id = ?', (project_id,))
    ocr = cursor.fetchone()
    if ocr:
        project_dict['ocr_text'] = dict(ocr).get('original_text', '')
        project_dict['cleaned_text'] = dict(ocr).get('cleaned_text', '')
        project_dict['confidence_data'] = dict(ocr).get('confidence_data')
    
    conn.close()
    return project_dict

# --- Search Index Helpers ---
def init_search_index():
    """Initialize/rebuild the full-text search index from existing projects"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Clear existing index
        cursor.execute('DELETE FROM search_index')
        
        # Get all projects with metadata and OCR text
        cursor.execute('''
            SELECT 
                p.id,
                p.filename,
                COALESCE(m.title, '') as title,
                COALESCE(m.author, '') as author,
                COALESCE(m.keywords, '') as keywords,
                COALESCE(o.original_text, '') as content,
                COALESCE(o.cleaned_text, '') as cleaned_content
            FROM projects p
            LEFT JOIN metadata m ON p.id = m.project_id
            LEFT JOIN ocr_text o ON p.id = o.project_id
        ''')
        
        projects = cursor.fetchall()
        
        # Insert into search index
        for project in projects:
            # Combine original and cleaned text for better search
            combined_content = f"{project['content']} {project['cleaned_content']}"
            
            cursor.execute('''
                INSERT INTO search_index (project_id, title, author, content, keywords)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                project['id'],
                project['title'],
                project['author'],
                combined_content,
                project['keywords']
            ))
        
        conn.commit()
        conn.close()
        print(f"✅ Search index initialized with {len(projects)} documents")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize search index: {e}")
        import traceback
        traceback.print_exc()
        return False

def update_search_index(project_id):
    """Update search index for a specific project"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get project data
        cursor.execute('''
            SELECT 
                p.id,
                COALESCE(m.title, '') as title,
                COALESCE(m.author, '') as author,
                COALESCE(m.keywords, '') as keywords,
                COALESCE(o.original_text, '') as content,
                COALESCE(o.cleaned_text, '') as cleaned_content
            FROM projects p
            LEFT JOIN metadata m ON p.id = m.project_id
            LEFT JOIN ocr_text o ON p.id = o.project_id
            WHERE p.id = ?
        ''', (project_id,))
        
        project = cursor.fetchone()
        
        if project:
            # Delete existing entry
            cursor.execute('DELETE FROM search_index WHERE project_id = ?', (project_id,))
            
            # Insert updated entry
            combined_content = f"{project['content']} {project['cleaned_content']}"
            cursor.execute('''
                INSERT INTO search_index (project_id, title, author, content, keywords)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                project['id'],
                project['title'],
                project['author'],
                combined_content,
                project['keywords']
            ))
            
            conn.commit()
        
        conn.close()
        return True
    except Exception as e:
        print(f"⚠️ Failed to update search index for project {project_id}: {e}")
        return False

# API Routes

@app.route('/')
def home():
    """API Information"""
    return jsonify({
        'name': 'LibraDigit AI Backend API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'projects': '/api/projects',
            'ocr': '/api/ocr/<project_id>',
            'cleanup': '/api/cleanup/<project_id>',
            'metadata': '/api/metadata/<project_id>',
            'archive': '/api/archive/<project_id>'
        },
        'current_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'current_time': datetime.now().strftime('%H:%M:%S')

    })

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get all projects"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects ORDER BY created_at DESC')
        projects = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'projects': [dict(p) for p in projects]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Configuration Helpers ---
def get_config_value(key, default=None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM app_config WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else default
    except Exception as e:
        print(f"Error reading config {key}: {e}")
        return default

def set_config_value(key, value):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error writing config {key}: {e}")
        return False

def get_archive_root():
    custom_path = get_config_value('archive_storage_path')
    if custom_path:
        # Validate path
        try:
            if not os.path.exists(custom_path):
                os.makedirs(custom_path, exist_ok=True)
            return custom_path
        except Exception as e:
            print(f"Failed to use custom archive path: {e}")
            return ARCHIVE_FOLDER
    return ARCHIVE_FOLDER

# --- Routes ---
@app.route('/api/search', methods=['GET'])
def search_archives():
    """Full-text search across all archived documents with advanced filtering"""
    try:
        query = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 20))
        
        # Advanced Filters
        exact_match = request.args.get('exact', 'false').lower() == 'true'
        smart_search = request.args.get('smart', 'false').lower() == 'true'
        field = request.args.get('field', 'all')
        year_start = request.args.get('year_start')
        year_end = request.args.get('year_end')
        
        # Return empty if no criteria
        if not query and not (year_start or year_end):
            return jsonify({'results': [], 'count': 0})
        
        # Construct FTS Query
        fts_query = query
        if query:
            if exact_match:
                fts_query = f'"{query}"'
            elif smart_search:
                # Add prefix matching to each word for "intelligence"
                if '"' not in query: # Don't mess with existing quotes
                    parts = query.split()
                    fts_query = " ".join([f"{p}*" for p in parts])
            
            # Apply Field restriction
            if field in ['title', 'author', 'content', 'keywords']:
                 fts_query = f'{field}:{fts_query}'

        conn = get_db()
        cursor = conn.cursor()
        
        params = []
        where_clauses = []
        
        # If we have a text query, use MATCH
        if query:
            where_clauses.append("search_index MATCH ?")
            params.append(fts_query)
        
        # Year Filtering from Metadata
        if year_start and year_start.isdigit():
            where_clauses.append("CAST(m.year AS INTEGER) >= ?")
            params.append(int(year_start))
            
        if year_end and year_end.isdigit():
             where_clauses.append("CAST(m.year AS INTEGER) <= ?")
             params.append(int(year_end))
             
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Determine snippet source (snippet function only works if MATCH is used)
        snippet_expr = "snippet(search_index, 2, '<mark>', '</mark>', '...', 32)" if query else "substr(s.content, 1, 200)"
        
        sql = f'''
            SELECT 
                s.project_id,
                s.title,
                s.author,
                {snippet_expr} as snippet,
                m.subject,
                m.year,
                rank
            FROM search_index s
            LEFT JOIN metadata m ON s.project_id = m.project_id
            WHERE {where_sql}
            ORDER BY rank
            LIMIT ?
        '''
        params.append(limit)
        
        cursor.execute(sql, params)
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['project_id'],
                'title': row['title'] or 'Untitled Document',
                'author': row['author'] or 'Unknown',
                'snippet': row['snippet'] or '',
                'subject': row['subject'] or 'General',
                'year': row['year'] or 'N/A'
            })
        
        conn.close()
        
        return jsonify({
            'results': results,
            'count': len(results),
            'query': query
        })
        
    except Exception as e:
        print(f"Search error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'results': []}), 500

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        settings = {
            'archive_storage_path': get_config_value('archive_storage_path', ARCHIVE_FOLDER),
            'export_as_zip': get_config_value('export_as_zip', 'false') == 'true',
            'date_format': get_config_value('date_format', 'YYYY-MM-DD'),
            'institution_name': get_config_value('institution_name', ''),
            'file_naming_convention': get_config_value('file_naming_convention', '{title}_{year}'),
            'default_ocr_language': get_config_value('default_ocr_language', 'eng'),
            'pdf_quality': get_config_value('pdf_quality', 'high'),
            'ocr_engine': get_config_value('ocr_engine', 'tesseract'),
        }
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    try:
        data = request.json
        if 'archive_storage_path' in data:
            # Validate path access
            path = data['archive_storage_path']
            if path and not os.path.exists(path):
                try:
                    os.makedirs(path, exist_ok=True)
                except Exception as e:
                    return jsonify({'error': f"Path is invalid or not writable: {str(e)}"}), 400
            set_config_value('archive_storage_path', path)
            
        if 'export_as_zip' in data:
            set_config_value('export_as_zip', str(data['export_as_zip']).lower())
            
        if 'date_format' in data:
            set_config_value('date_format', data['date_format'])

        # New Professional Settings
        if 'institution_name' in data:
            set_config_value('institution_name', data['institution_name'])
            
        if 'file_naming_convention' in data:
            set_config_value('file_naming_convention', data['file_naming_convention'])
            
        if 'default_ocr_language' in data:
            set_config_value('default_ocr_language', data['default_ocr_language'])
            
        if 'pdf_quality' in data:
            set_config_value('pdf_quality', data['pdf_quality'])

        if 'ocr_engine' in data:
            engine = data['ocr_engine']
            if engine not in ('tesseract', 'glm-ocr'):
                return jsonify({'error': f'Unknown OCR engine: {engine}'}), 400
            set_config_value('ocr_engine', engine)
            
        return jsonify({'message': 'Settings updated successfully', 'settings': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/glmocr/status', methods=['GET'])
def glmocr_status():
    """Check whether Ollama is running and glm-ocr model is available."""
    try:
        status = check_ollama_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'available': False, 'model_pulled': False, 'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project with file upload"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            # Fallback to JSON data (for compatibility)
            data = request.json
            filename = data.get('filename')
            filepath = data.get('filepath', '')
            
            if not filename:
                return jsonify({'error': 'Filename is required'}), 400
            
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO projects (filename, filepath, status)
                VALUES (?, ?, 'upload')
            ''', (filename, filepath))
            
            project_id = cursor.lastrowid
            
            # Create files entry
            cursor.execute('''
                INSERT INTO files (project_id, original_path)
                VALUES (?, ?)
            ''', (project_id, filepath))
            
            # Create empty OCR text entry
            cursor.execute('''
                INSERT INTO ocr_text (project_id)
                VALUES (?)
            ''', (project_id,))
            
            conn.commit()
            conn.close()
            
            project = get_project_data(project_id)
            return jsonify({'project': project})
        
        # Handle file upload
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file
        filename = file.filename
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Create project
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO projects (filename, filepath, status)
            VALUES (?, ?, 'upload')
        ''', (filename, filepath))
        
        project_id = cursor.lastrowid
        
        # Create files entry
        cursor.execute('''
            INSERT INTO files (project_id, original_path)
            VALUES (?, ?)
        ''', (project_id, filepath))
        
        # Create empty OCR text entry
        cursor.execute('''
            INSERT INTO ocr_text (project_id)
            VALUES (?)
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        project = get_project_data(project_id)
        return jsonify({'project': project})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Get a specific project"""
    try:
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        return jsonify({'project': project})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/file', methods=['GET'])
def get_project_file(project_id):
    """Serve the project file (original or processed)"""
    try:
        from flask import send_file
        
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        files = project.get('files', {})
        
        # Determine best file to serve
        file_path = None
        if files.get('final_path') and os.path.exists(files['final_path']):
            file_path = files['final_path']
        elif files.get('ocr_path') and os.path.exists(files['ocr_path']):
            file_path = files['ocr_path']
        elif files.get('original_path') and os.path.exists(files['original_path']):
            file_path = files['original_path']
            
        if not file_path:
            return jsonify({'error': 'File not found'}), 404
            
        return send_file(file_path)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/status', methods=['PUT'])
def update_project_status(project_id):
    """Update project status"""
    try:
        data = request.json
        status = data.get('status')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE projects 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, project_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Delete related records
        cursor.execute('DELETE FROM files WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM metadata WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM ocr_text WHERE project_id = ?', (project_id,))
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ocr/<int:project_id>', methods=['POST'])
def run_ocr(project_id):
    """Run OCR on a project"""
    try:
        # Get project data
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        filepath = project.get('filepath', '')
        if not filepath or not os.path.exists(filepath):
            # Fallback for missing file provided in original code...
            sample_text = """This is a sample OCR extracted text.

In a production environment, this would be the actual text extracted from the uploaded document using Tesseract OCR.

The text would contain all the content from the scanned document, which can then be cleaned up and edited by the user.

Common OCR errors include:
- Misreading 'rn' as 'm'
- Confusing '0' (zero) with 'O' (letter O)
- Missing or extra spaces
- Special character recognition issues

This sample demonstrates the workflow of the LibraDigit AI application.

Note: To extract real text, please upload a PDF or image file."""
            
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE ocr_text 
                SET original_text = ?
                WHERE project_id = ?
            ''', (sample_text, project_id))
            
            cursor.execute('''
                UPDATE projects 
                SET status = 'cleanup', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (project_id,))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'pages': 1,
                'text_length': len(sample_text),
                'message': 'Sample OCR text generated (file not found)'
            })
        
        # Get language preference and OCR engine setting
        req_data = request.get_json(silent=True) or {}
        lang = req_data.get('language', 'eng')
        ocr_engine = get_config_value('ocr_engine', 'tesseract')
        
        # Extract text based on file type
        extracted_text = ""
        ocr_pdf_path = None
        file_ext = os.path.splitext(filepath)[1].lower()
        
        # ... (keep text file and PDF logic same for now, Tesseract is for images mainly) ... 
        # (Actually, 'pdf_reader' doesn't use Tesseract directly in the PDF block above, it uses PyPDF2. 
        #  If we want OCR on PDFs we'd need 'ocr_my_pdf' or convert to images. 
        #  The user context implies we are focusing on IMAGE OCR mainly or where Tesseract is used).
        
        # First, check if it's actually a text file masquerading as a PDF
        if file_ext == '.pdf' and is_text_file(filepath):
            # ... (keep existing text file logic) ...
            try:
                converted = convert_text_file_to_pdf(filepath)
                if converted:
                    print(f"✅ Successfully converted to PDF")
                    file_type_msg = "text file (auto-converted to PDF)"
                    
                    # Now extract text from the converted PDF
                    try:
                        with open(filepath, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            num_pages = len(pdf_reader.pages)
                            
                            for page_num in range(num_pages):
                                page = pdf_reader.pages[page_num]
                                extracted_text += page.extract_text() + "\\n\\n"
                            
                            if not extracted_text.strip():
                                extracted_text = "Converted PDF but no text could be extracted."
                    except Exception as e:
                        extracted_text = f"Converted to PDF but error extracting text: {str(e)}"
                else:
                    # Conversion failed, extract text directly
                    extracted_text = extract_text_from_text_file(filepath)
                    file_type_msg = "text file (conversion failed, extracted as-is)"
            except Exception as e:
                print(f"❌ Conversion error: {str(e)}")
                # Fallback to text extraction
                extracted_text = extract_text_from_text_file(filepath)
                file_type_msg = "text file (conversion error, extracted as-is)"
        
        elif file_ext == '.pdf':
            # Extract text from PDF
            try:
                # First try standard text extraction with PyPDF2
                with open(filepath, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    num_pages = len(pdf_reader.pages)
                    
                    for page_num in range(num_pages):
                        page = pdf_reader.pages[page_num]
                        text = page.extract_text()
                        if text:
                            extracted_text += text + "\\n\\n"
                
                # If little/no text found, treat as scanned PDF (image-like)
                if not extracted_text.strip() or len(extracted_text.strip()) < 50:
                    print("⚠️ Minimal text found in PDF, attempting OCR as scanned document...")
                    
                    try:
                         # Use PyMuPDF (fitz) to render pages as images
                         doc = fitz.open(filepath)
                         ocr_text = ""
                         confidence_data = [] # New: Store low-confidence words
                         pdf_merger = PyPDF2.PdfMerger() # New: For Searchable PDF
                         has_pdf_pages = False
                         
                         print(f"📄 Processing {len(doc)} pages with OCR...")
                         for page_idx, page in enumerate(doc):
                             # Render page to image (300 DPI for better OCR)
                             pix = page.get_pixmap(dpi=300)
                             img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                             
                             # 1. Generate Searchable PDF Page
                             try:
                                 pdf_bytes = pytesseract.image_to_pdf_or_hocr(img, extension='pdf', lang=lang)
                                 pdf_merger.append(io.BytesIO(pdf_bytes))
                                 has_pdf_pages = True
                             except Exception as pdf_err:
                                 print(f"  ⚠️ Searchable PDF Gen failed for p{page_idx}: {pdf_err}")
                             
                             # 2. Extract Confidence Data
                             page_conf = extract_confidence_from_image(img, lang=lang)
                             if page_conf:
                                 for item in page_conf:
                                     item['page'] = page_idx + 1
                                 confidence_data.extend(page_conf)
                             
                             # 3. Standard OCR
                             page_text = pytesseract.image_to_string(img, lang=lang)
                             
                             # If minimal text found, try handwritten OCR mode
                             if len(page_text.strip()) < 20:
                                 print(f"  Page {page_idx + 1}: Trying handwritten OCR mode...")
                                 # Use LSTM mode (--oem 1) which is better for handwriting
                                 # PSM 6 assumes uniform block of text
                                 handwritten_config = r'--oem 1 --psm 6'
                                 page_text = pytesseract.image_to_string(
                                     img, 
                                     lang=lang,
                                     config=handwritten_config
                                 )
                                 if page_text.strip():
                                     print(f"  ✍️ Handwritten text detected on page {page_idx + 1}")
                             
                             ocr_text += page_text + "\\n\\n"
                         
                         # Save Searchable PDF
                         if has_pdf_pages:
                             ocr_filename = f"ocr_{os.path.splitext(os.path.basename(filepath))[0]}.pdf"
                             ocr_pdf_path = os.path.join(UPLOAD_FOLDER, ocr_filename)
                             pdf_merger.write(ocr_pdf_path)
                             pdf_merger.close()
                             print(f"✅ Generated searchable PDF: {ocr_pdf_path}")
                         
                         if ocr_text.strip():
                             extracted_text = ocr_text
                             file_type_msg = "PDF (Scanned/OCR)"
                         else:
                             if not extracted_text.strip():
                                 extracted_text = "No text found in PDF (OCR produced no results)."
                                 file_type_msg = "PDF (Empty)"
                    except Exception as ocr_err:
                        print(f"❌ PDF OCR Error: {ocr_err}")
                        if not extracted_text.strip():
                            extracted_text = f"No text found in PDF. OCR failed: {str(ocr_err)}"
                        file_type_msg = "PDF (OCR Failed)"
                else:
                    file_type_msg = "PDF"
                        
            except Exception as e:
                extracted_text = f"Error extracting text from PDF: {str(e)}\\n\\nAttempting fallback OCR..."
                # Try OCR as fallback
                try:
                    doc = fitz.open(filepath)
                    extracted_text = ""
                    for page_idx, page in enumerate(doc):
                        pix = page.get_pixmap(dpi=300)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        
                        # Try standard OCR
                        page_text = pytesseract.image_to_string(img, lang=lang)
                        
                        # If minimal text, try handwritten mode
                        if len(page_text.strip()) < 20:
                            handwritten_config = r'--oem 1 --psm 6'
                            page_text = pytesseract.image_to_string(img, lang=lang, config=handwritten_config)
                        
                        extracted_text += page_text + "\\n\\n"
                    file_type_msg = "PDF (OCR Fallback)"
                except Exception as inner_e:
                    extracted_text += f"\\nOCR Fallback failed: {str(inner_e)}"
                    file_type_msg = "PDF (Error)"
        
        elif file_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            # ── GLM-OCR path ──────────────────────────────────────────────────────
            if ocr_engine == 'glm-ocr':
                try:
                    print("🤖 Using GLM-OCR engine (Ollama)")
                    glm = GlmOcrProcessor()
                    glm_result = glm.process_image(filepath)
                    if glm_result.get('success'):
                        extracted_text = glm_result.get('main_text', '')
                        file_type_msg = "image (GLM-OCR)"
                    else:
                        raise RuntimeError(glm_result.get('error', 'GLM-OCR failed'))
                except Exception as e:
                    extracted_text = f"GLM-OCR error: {str(e)}"
                    file_type_msg = "image (GLM-OCR error)"
            # ── Tesseract path ────────────────────────────────────────────────────
            else:
                try:
                    if check_tesseract():
                        image = Image.open(filepath)
                        
                        # 1. Get plain text for UI editing
                        extracted_text = pytesseract.image_to_string(image, lang=lang)
                        
                        # 2. Extract Confidence
                        confidence_data = extract_confidence_from_image(image, lang=lang)
                        
                        if not extracted_text.strip():
                            extracted_text = "No text detected in image. Please ensure the image contains readable text."
                        
                        # 3. Generate Searchable PDF (HOCR/Image-over-Text)
                        try:
                            pdf_bytes = pytesseract.image_to_pdf_or_hocr(image, extension='pdf', lang=lang)
                            filename_base = os.path.splitext(os.path.basename(filepath))[0]
                            ocr_filename = f"ocr_{filename_base}.pdf"
                            ocr_pdf_path = os.path.join(UPLOAD_FOLDER, ocr_filename)
                            with open(ocr_pdf_path, 'wb') as f:
                                f.write(pdf_bytes)
                            print(f"✅ Generated searchable PDF: {ocr_pdf_path}")
                        except Exception as e:
                            print(f"⚠️ Failed to generate searchable PDF: {e}")
                    else:
                        extracted_text = """Tesseract OCR is not installed.\n\nTo extract text from images, please install Tesseract OCR:\n- Windows: https://github.com/UB-Mannheim/tesseract/wiki\n- macOS: brew install tesseract\n- Linux: sudo apt-get install tesseract-ocr"""
                    file_type_msg = "image"
                except Exception as e:
                    extracted_text = f"Error extracting text from image: {str(e)}"
                    if "tessdata" in str(e) or "traineddata" in str(e):
                        extracted_text += f"\n\nError: The '{lang}' language pack might be missing. Please install it for Tesseract."
                    file_type_msg = "image (error)"
        
        else:
            extracted_text = f"Unsupported file type: {file_ext}\\n\\nSupported formats: PDF, PNG, JPG, JPEG, TIFF, BMP"
            file_type_msg = f"unsupported ({file_ext})"
        
        # Save extracted text to database
        conn = get_db()
        cursor = conn.cursor()
        
        # Serialize confidence data
        import json
        conf_json = json.dumps(confidence_data) if 'confidence_data' in locals() and confidence_data else None

        cursor.execute('''
            UPDATE ocr_text 
            SET original_text = ?, confidence_data = ?
            WHERE project_id = ?
        ''', (extracted_text, conf_json, project_id))
        
        # Update ocr_path if we generated one
        if ocr_pdf_path:
            cursor.execute('''
                UPDATE files 
                SET ocr_path = ?
                WHERE project_id = ?
            ''', (ocr_pdf_path, project_id))
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'cleanup', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'pages': 1,
            'text_length': len(extracted_text),
            'message': 'OCR completed successfully',
            'file_type': file_type_msg if 'file_type_msg' in locals() else file_ext
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/ocr/advanced/<int:project_id>', methods=['POST'])
def run_advanced_ocr(project_id):
    """Run Advanced OCR with layout analysis, table detection, and structure recognition"""
    try:
        # Get project data
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        filepath = project.get('filepath', '')
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        # Get language preference and engine setting
        req_data = request.get_json(silent=True) or {}
        lang = req_data.get('language', 'eng')
        use_advanced = req_data.get('advanced', True)
        ocr_engine = get_config_value('ocr_engine', 'tesseract')
        
        file_ext = os.path.splitext(filepath)[1].lower()
        
        # Only process images with advanced OCR
        if file_ext not in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            return jsonify({
                'error': 'Advanced OCR only supports image files (PNG, JPG, JPEG, TIFF, BMP)',
                'file_type': file_ext
            }), 400
        
        # ── GLM-OCR advanced path ─────────────────────────────────────────────
        if ocr_engine == 'glm-ocr':
            try:
                print("🤖 Advanced OCR: Using GLM-OCR engine (Ollama)")
                glm = GlmOcrProcessor()
                text_result = glm.recognize_text(filepath)
                table_result = glm.recognize_table(filepath)

                extracted_text = text_result
                if table_result.strip():
                    extracted_text += "\n\n--- TABLES ---\n" + table_result

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('UPDATE ocr_text SET original_text = ? WHERE project_id = ?',
                               (extracted_text, project_id))
                cursor.execute('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                               ('cleanup', project_id))
                conn.commit()
                conn.close()
                update_search_index(project_id)

                return jsonify({
                    'success': True,
                    'main_text': extracted_text,
                    'text_length': len(extracted_text),
                    'engine': 'glm-ocr',
                    'statistics': {
                        'total_words': len(extracted_text.split()),
                        'tables_found': 1 if table_result.strip() else 0,
                        'checkboxes_found': 0,
                        'text_fields_found': 0,
                        'stamps_found': 0,
                        'signatures_found': 0,
                    }
                })
            except Exception as e:
                import traceback; traceback.print_exc()
                return jsonify({'error': f'GLM-OCR advanced error: {str(e)}', 'success': False}), 500

        # ── Tesseract advanced path ───────────────────────────────────────────
        # Initialize advanced OCR processor
        processor = AdvancedOCRProcessor()
        
        # Process document with full layout analysis
        result = processor.process_document_with_layout(filepath, lang)
        
        if not result.get('success'):
            return jsonify({
                'error': result.get('error', 'Advanced OCR processing failed'),
                'success': False
            }), 500
        
        # Generate structured output for the UI
        structured_text = processor.generate_structured_output(result)
        
        # Save to database
        conn = get_db()
        cursor = conn.cursor()
        
        # Save the structured text as original_text
        cursor.execute('''
            UPDATE ocr_text 
            SET original_text = ?
            WHERE project_id = ?
        ''', (structured_text, project_id))
        
        # Save the analysis results as JSON in a new column (we'll add this)
        # For now, we'll store it in cleaned_text temporarily
        analysis_json = json.dumps({
            'orientation': result.get('orientation'),
            'page_structure': result.get('page_structure'),
            'tables': result.get('tables'),
            'forms': result.get('forms'),
            'statistics': result.get('statistics')
        }, indent=2)
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'cleanup', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Advanced OCR completed successfully',
            'statistics': {
                'total_words': int(result.get('statistics', {}).get('total_words', 0)),
                'tables_found': int(result.get('statistics', {}).get('tables_found', 0)),
                'checkboxes_found': int(result.get('statistics', {}).get('checkboxes_found', 0)),
                'text_fields_found': int(result.get('statistics', {}).get('text_fields_found', 0)),
                'stamps_found': int(result.get('statistics', {}).get('stamps_found', 0)),
                'signatures_found': int(result.get('statistics', {}).get('signatures_found', 0))
            },
            'orientation': {
                'corrected': bool(result.get('orientation', {}).get('corrected', False)),
                'rotation_angle': int(result.get('orientation', {}).get('rotation_angle', 0))
            },
            'page_structure': {
                'has_header': bool(result.get('page_structure', {}).get('header', {}).get('present', False)),
                'has_footer': bool(result.get('page_structure', {}).get('footer', {}).get('present', False)),
                'stamps_count': int(len(result.get('page_structure', {}).get('stamps', []))),
                'signatures_count': int(len(result.get('page_structure', {}).get('signatures', [])))
            },
            'tables_found': int(len(result.get('tables', []))),
            'forms_found': {
                'checkboxes': int(len(result.get('forms', {}).get('checkboxes', []))),
                'text_fields': int(len(result.get('forms', {}).get('text_fields', [])))
            },
            'text_length': int(len(structured_text)),
            'pages': 1
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/handwritten-to-pdf/<int:project_id>', methods=['POST'])
def convert_handwritten_to_pdf(project_id):
    """Convert handwritten text image to formatted PDF"""
    try:
        # Get project data
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        filepath = project.get('filepath', '')
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        # Get parameters
        req_data = request.get_json(silent=True) or {}
        lang = req_data.get('language', 'eng')
        title = req_data.get('title', project.get('title', 'Handwritten Notes'))
        
        file_ext = os.path.splitext(filepath)[1].lower()
        
        # Only process images
        if file_ext not in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            return jsonify({
                'error': 'Handwritten to PDF conversion only supports image files',
                'file_type': file_ext
            }), 400
        
        # Initialize converter
        converter = HandwrittenToPDFConverter()
        
        # Generate output path
        output_filename = f"handwritten_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = os.path.join(UPLOAD_FOLDER, output_filename)
        
        # Get Institution Name from config
        institution = get_config_value('institution_name', '')
        
        # Prepare metadata for PDF
        pdf_metadata = {
            'author': institution if institution else f"Project {project_id}",
            'subject': f"Digitized Document: {title}",
            'creator': f"{institution} via LibraDigit AI" if institution else "LibraDigit AI"
        }

        # Convert handwritten text to PDF
        result = converter.convert_handwritten_to_pdf(
            image_path=filepath,
            output_path=output_path,
            title=title,
            language=lang,
            metadata=pdf_metadata
        )
        
        if not result.get('success'):
            return jsonify({
                'error': result.get('error', 'Conversion failed'),
                'success': False
            }), 500
        
        # Save the extracted text to database
        conn = get_db()
        cursor = conn.cursor()
        
        extracted_text = result.get('extracted_text', '')
        
        cursor.execute('''
            UPDATE ocr_text 
            SET original_text = ?
            WHERE project_id = ?
        ''', (extracted_text, project_id))
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'cleanup', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Handwritten text converted to PDF successfully',
            'pdf_path': output_path,
            'pdf_filename': output_filename,
            'word_count': int(result.get('word_count', 0)),
            'line_count': int(result.get('line_count', 0)),
            'text_length': len(extracted_text)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/cleanup/<int:project_id>', methods=['POST'])
def save_cleaned_text(project_id):
    """Save cleaned OCR text"""
    try:
        data = request.json
        cleaned_text = data.get('cleaned_text', '')
        
        if not cleaned_text.strip():
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE ocr_text 
            SET cleaned_text = ?
            WHERE project_id = ?
        ''', (cleaned_text, project_id))
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'metadata', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        # Update search index with new cleaned text
        update_search_index(project_id)
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metadata/<int:project_id>', methods=['POST'])
def save_metadata(project_id):
    """Save project metadata"""
    try:
        data = request.json
        title = data.get('title', '')
        author = data.get('author', '')
        year = data.get('year', '')
        subject = data.get('subject', '')
        keywords = data.get('keywords', '')
        
        if not title.strip():
            return jsonify({'error': 'Title is mandatory'}), 400
        
        if year and not year.isdigit():
            return jsonify({'error': 'Year must be numeric'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if metadata exists
        cursor.execute('SELECT id FROM metadata WHERE project_id = ?', (project_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE metadata 
                SET title = ?, author = ?, year = ?, subject = ?, keywords = ?
                WHERE project_id = ?
            ''', (title, author, year, subject, keywords, project_id))
        else:
            cursor.execute('''
                INSERT INTO metadata (project_id, title, author, year, subject, keywords)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (project_id, title, author, year, subject, keywords))
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'archived', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        # Update search index with new metadata
        update_search_index(project_id)
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/archive/<int:project_id>', methods=['POST'])
def generate_archive(project_id):
    """Generate archive file with proper structure"""
    try:
        project = get_project_data(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        metadata = project.get('metadata', {})
        
        # Build archive path
        subject = metadata.get('subject', 'General')
        year = metadata.get('year', 'Unknown')
        author = metadata.get('author', '')
        title = metadata.get('title', 'Untitled')
        
        # Sanitize filename function - remove special characters and spaces
        def sanitize_filename(text):
            """Remove special characters and spaces from filename"""
            if not text:
                return ''
            # Replace spaces with underscores
            text = text.replace(' ', '_')
            # Remove special characters, keep only alphanumeric, underscore, and hyphen
            import re
            text = re.sub(r'[^a-zA-Z0-9_-]', '', text)
            # Remove multiple consecutive underscores
            text = re.sub(r'_+', '_', text)
            # Remove leading/trailing underscores
            text = text.strip('_')
            return text
        
        # Sanitize all components
        subject = sanitize_filename(subject)
        year = sanitize_filename(year)
        author = sanitize_filename(author)
        title = sanitize_filename(title)
        
        # Create filename
        filename_parts = []
        if author:
            filename_parts.append(author)
        if year:
            filename_parts.append(year)
        filename_parts.append(title)
        
        project_name = '_'.join(filename_parts)
        filename_pdf = project_name + '.pdf'
        
        # Create BagIt-style directory structure
        # /Archive/Subject/Year/ProjectName/
        #   ├── data/
        #   │   └── ProjectName.pdf
        #   ├── bag-info.txt
        #   └── manifest-md5.txt
        
        archive_base = os.path.join(ARCHIVE_FOLDER, subject, year, project_name)
        data_dir = os.path.join(archive_base, 'data')
        
        os.makedirs(data_dir, exist_ok=True)
        
        final_path = os.path.join(data_dir, filename_pdf)
        
        # Copy the actual processed PDF to the archive location
        # Get the cleaned PDF path from the database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT cleaned_path, original_path, ocr_path FROM files WHERE project_id = ?', (project_id,))
        file_data = cursor.fetchone()
        
        if file_data:
            # Priority: Searchable OCR PDF > Cleaned PDF (if existed) > Original
            source_path = None
            if file_data['ocr_path'] and os.path.exists(file_data['ocr_path']):
                source_path = file_data['ocr_path']
                print(f"📄 Using searchable OCR PDF: {source_path}")
            elif file_data['cleaned_path'] and os.path.exists(file_data['cleaned_path']):
                source_path = file_data['cleaned_path']
            else:
                source_path = file_data['original_path']

            if source_path and os.path.exists(source_path):
                # Check if source is really a PDF or needs conversion
                src_ext = os.path.splitext(source_path)[1].lower()
                
                if src_ext == '.pdf':
                    # It's a PDF (either original, cleaned, or OCR result)
                    import shutil
                    shutil.copy2(source_path, final_path)
                    print(f"✅ Copied PDF from {source_path} to {final_path}")
                elif src_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                    # It's an image, convert to PDF
                    try:
                        image = Image.open(source_path)
                        # Identify if it's RGBA (transparent), convert to RGB for PDF
                        if image.mode == 'RGBA':
                            image = image.convert('RGB')
                        image.save(final_path, 'PDF', resolution=100.0)
                        print(f"✅ Converted image {source_path} to PDF at {final_path}")
                    except Exception as e:
                        print(f"❌ Failed to convert image to PDF: {e}")
                        # Fallback to placeholder
                        from reportlab.pdfgen import canvas
                        from reportlab.lib.pagesizes import letter
                        c = canvas.Canvas(final_path, pagesize=letter)
                        c.drawString(100, 750, f"Error archiving file: {title}")
                        c.drawString(100, 730, f"Could not convert original image to PDF.")
                        c.save()
                else:
                     # Unknown format, try copy but might fail
                    import shutil
                    shutil.copy2(source_path, final_path)
                    print(f"⚠️ Copied unknown file type from {source_path} to {final_path}")
            else:
                print(f"⚠️ Source file not found: {source_path}")
                # Create a minimal valid PDF as fallback
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import letter
                
                c = canvas.Canvas(final_path, pagesize=letter)
                c.drawString(100, 750, f"Archive file for: {title}")
                c.drawString(100, 730, f"Author: {author}")
                c.drawString(100, 710, f"Year: {year}")
                c.drawString(100, 690, f"Subject: {subject}")
                c.drawString(100, 650, "Note: Original file not found")
                c.save()
                print(f"⚠️ Created placeholder PDF at {final_path}")

        else:
             print(f"❌ No file data found for project {project_id}")
             # Create a minimal valid PDF as fallback
             from reportlab.pdfgen import canvas
             from reportlab.lib.pagesizes import letter
             
             c = canvas.Canvas(final_path, pagesize=letter)
             c.drawString(100, 750, f"Archive file for: {title}")
             c.drawString(100, 730, f"Author: {author}")
             c.drawString(100, 710, f"Year: {year}")
             c.drawString(100, 690, f"Subject: {subject}")
             c.save()
             print(f"⚠️ Created placeholder PDF at {final_path}")
        
        # -------------------------------------------------------------
        # Embed Metadata into PDF
        # -------------------------------------------------------------
        try:
            if os.path.exists(final_path) and final_path.lower().endswith('.pdf'):
                print(f"ℹ️ Embeding metadata into {final_path}")
                # Create metadata dict
                pdf_metadata = {
                    '/Title': metadata.get('title', ''),
                    '/Author': metadata.get('author', ''),
                    '/Subject': metadata.get('subject', ''),
                    '/Keywords': metadata.get('keywords', ''),
                    '/Producer': 'LibraDigit AI - github.com/carthworks',
                    '/Creator': 'LibraDigit AI',
                    '/CreationDate': datetime.now().strftime("D:%Y%m%d%H%M%S"),
                    '/ModDate': datetime.now().strftime("D:%Y%m%d%H%M%S")
                }

                # We have to read, add metadata, and write back
                # Using a temporary file to avoid read/write conflicts
                temp_output_path = final_path + ".temp.pdf"
                
                reader = PyPDF2.PdfReader(final_path)
                writer = PyPDF2.PdfWriter()

                # Add all pages
                for page in reader.pages:
                    writer.add_page(page)

                # Add metadata
                writer.add_metadata(pdf_metadata)

                with open(temp_output_path, "wb") as f_out:
                    writer.write(f_out)
                
                # Replace original with metadata enriched version
                import shutil
                shutil.move(temp_output_path, final_path)
                print(f"✅ Metadata successfully embedded into PDF")

        except Exception as e:
            print(f"⚠️ Failed to embed metadata into PDF: {e}")
            # Non-critical error, continue with archiving flow
        # -------------------------------------------------------------

        # -------------------------------------------------------------
        # Create BagIt Metadata Files
        # -------------------------------------------------------------
        try:
            # 1. bag-info.txt
            bag_info_path = os.path.join(archive_base, 'bag-info.txt')
            with open(bag_info_path, 'w') as f:
                f.write(f"Source-Organization: LibraDigit AI\n")
                f.write(f"Organization-Address: 123 Digital Way, Archive City\n")
                f.write(f"Contact-Name: {author}\n")
                f.write(f"External-Description: {title}\n")
                f.write(f"Bagging-Date: {datetime.now().strftime('%Y-%m-%d')}\n")
                f.write(f"Bag-Software-Agent: LibraDigit AI v1.0\n")
                f.write(f"Payload-Oxum: {os.path.getsize(final_path)}.1\n")
            
            # 2. manifest-md5.txt
            import hashlib
            
            def get_md5(file_path):
                hash_md5 = hashlib.md5()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hash_md5.update(chunk)
                return hash_md5.hexdigest()
            
            if os.path.exists(final_path):
                md5_hash = get_md5(final_path)
                manifest_path = os.path.join(archive_base, 'manifest-md5.txt')
                with open(manifest_path, 'w') as f:
                    f.write(f"{md5_hash} data/{filename_pdf}\n")
                    
            print(f"✅ BagIt structure created at {archive_base}")
            
        except Exception as e:
            print(f"⚠️ Failed to create BagIt metadata: {e}")
        # -------------------------------------------------------------
        
        # Update database
        cursor.execute('''
            UPDATE files 
            SET final_path = ?
            WHERE project_id = ?
        ''', (final_path, project_id))
        
        cursor.execute('''
            UPDATE projects 
            SET status = 'archived', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (project_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'archive_path': final_path,
            'file_size': os.path.getsize(final_path) if os.path.exists(final_path) else 0
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'database': os.path.exists(DATABASE),
        'tesseract': check_tesseract()
    })

def check_tesseract():
    """Check if Tesseract is installed"""
    try:
        pytesseract.get_tesseract_version()
        return True
    except:
        return False

def is_text_file(filepath):
    """Check if a file is actually a text file despite having .pdf extension"""
    try:
        with open(filepath, 'rb') as f:
            header = f.read(4)
            # PDF files start with %PDF
            if header.startswith(b'%PDF'):
                return False
            return True
    except Exception as e:
        print(f"Error checking file type: {e}")
        return False

def extract_text_from_text_file(filepath):
    """Extract text from a plain text file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse metadata if present
        lines = content.strip().split('\n')
        metadata = {}
        text_parts = []
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                if key in ['Archive file for', 'Author', 'Year', 'Subject', 'Title']:
                    metadata[key] = value
                    text_parts.append(f"{key}: {value}")
                else:
                    text_parts.append(line)
            else:
                text_parts.append(line)
        
        extracted_text = '\n'.join(text_parts)
        
        # Add a note about the file type
        note = "\n\n[Note: This file was detected as a plain text file with a .pdf extension. The content above has been extracted as-is.]"
        
        return extracted_text + note
        
    except Exception as e:
        return f"Error reading text file: {str(e)}"

def convert_text_file_to_pdf(filepath):
    """
    Convert a text file to a proper PDF document
    Returns True if successful, False otherwise
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        
        # Read the text content
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse metadata if present
        lines = content.strip().split('\n')
        metadata = {}
        remaining_text = []
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                if key in ['Archive file for', 'Author', 'Year', 'Subject', 'Title']:
                    metadata[key] = value
                else:
                    remaining_text.append(line)
            else:
                remaining_text.append(line)
        
        # Create a temporary file for the PDF
        import tempfile
        temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
        os.close(temp_fd)
        
        # Create PDF
        doc = SimpleDocTemplate(
            temp_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#1a1a1a',
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#333333',
            spaceAfter=12
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=11,
            textColor='#444444',
            alignment=TA_LEFT,
            spaceAfter=12
        )
        
        # Add title
        title = metadata.get('Archive file for', metadata.get('Title', 'Document'))
        elements.append(Paragraph(title, title_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Add metadata
        if 'Author' in metadata:
            elements.append(Paragraph(f"<b>Author:</b> {metadata['Author']}", heading_style))
        
        if 'Year' in metadata:
            elements.append(Paragraph(f"<b>Year:</b> {metadata['Year']}", heading_style))
        
        if 'Subject' in metadata:
            elements.append(Paragraph(f"<b>Subject:</b> {metadata['Subject']}", heading_style))
        
        elements.append(Spacer(1, 0.3 * inch))
        
        # Add remaining text
        if remaining_text:
            for line in remaining_text:
                if line.strip():
                    elements.append(Paragraph(line, body_style))
        else:
            # If no additional text, add a placeholder
            elements.append(Paragraph(
                "This document was automatically converted from a text file to PDF format.",
                body_style
            ))
        
        # Build PDF
        doc.build(elements)
        
        # Replace original file with converted PDF
        import shutil
        shutil.move(temp_path, filepath)
        
        return True
        
    except ImportError as e:
        print(f"❌ reportlab not installed: {e}")
        print("   Install with: pip install reportlab")
        return False
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return False

# Initialize batch processor
batch_processor = None

def get_batch_processor():
    """Get or create batch processor instance"""
    global batch_processor
    if batch_processor is None:
        batch_processor = BatchProcessor(DATABASE, UPLOAD_FOLDER)
    return batch_processor

# ============================================================================
# AI METADATA EXTRACTION ENDPOINTS
# ============================================================================

@app.route('/api/metadata/extract/<int:project_id>', methods=['POST'])
def extract_metadata_suggestions(project_id):
    """
    Extract metadata suggestions using AI
    """
    try:
        print(f"✨ Extracting metadata for project {project_id}")
        
        # Get project data
        project = get_project_data(project_id)
        if not project:
            print(f"❌ Project {project_id} not found")
            return jsonify({'error': 'Project not found'}), 404
        
        # Get OCR text
        ocr_text = project.get('ocr_text', '')
        if not ocr_text:
            print(f"❌ No OCR text for project {project_id}")
            return jsonify({'error': 'No OCR text available. Please run OCR first.'}), 400
        
        print(f"📄 OCR text length: {len(ocr_text)} characters")
        
        # Get filename for fallback
        filename = project.get('filename', '')
        
        # Extract metadata
        print(f"🤖 Running AI extraction...")
        suggestions = extract_metadata(ocr_text, filename)
        
        # Save suggestions to database
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if suggestions already exist
        cursor.execute('SELECT id FROM metadata_suggestions WHERE project_id = ?', (project_id,))
        existing = cursor.fetchone()
        
        confidence_scores_json = json.dumps(suggestions['confidence_scores'])
        
        if existing:
            cursor.execute('''
                UPDATE metadata_suggestions 
                SET suggested_title = ?, suggested_author = ?, suggested_year = ?,
                    suggested_subject = ?, suggested_keywords = ?, confidence_scores = ?
                WHERE project_id = ?
            ''', (
                suggestions['title'],
                suggestions['author'],
                suggestions['year'],
                suggestions['subject'],
                suggestions['keywords'],
                confidence_scores_json,
                project_id
            ))
        else:
            cursor.execute('''
                INSERT INTO metadata_suggestions 
                (project_id, suggested_title, suggested_author, suggested_year, 
                 suggested_subject, suggested_keywords, confidence_scores)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                project_id,
                suggestions['title'],
                suggestions['author'],
                suggestions['year'],
                suggestions['subject'],
                suggestions['keywords'],
                confidence_scores_json
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'suggestions': suggestions
        })
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ Error extracting metadata for project {project_id}: {error_msg}")
        traceback.print_exc()
        return jsonify({'error': error_msg, 'details': traceback.format_exc()}), 500

@app.route('/api/metadata/suggestions/<int:project_id>', methods=['GET'])
def get_metadata_suggestions(project_id):
    """
    Get saved metadata suggestions for a project
    """
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM metadata_suggestions WHERE project_id = ?', (project_id,))
        suggestions = cursor.fetchone()
        conn.close()
        
        if not suggestions:
            return jsonify({'suggestions': None})
        
        suggestions_dict = dict(suggestions)
        
        # Parse confidence scores JSON
        if suggestions_dict.get('confidence_scores'):
            suggestions_dict['confidence_scores'] = json.loads(suggestions_dict['confidence_scores'])
        
        return jsonify({'suggestions': suggestions_dict})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# BATCH PROCESSING ENDPOINTS
# ============================================================================

@app.route('/api/batch/create', methods=['POST'])
def create_batch():
    """
    Create a new batch job with multiple file uploads
    """
    try:
        # Check if files are in request
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        batch_name = request.form.get('batch_name', f'Batch {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        
        if not files or len(files) == 0:
            return jsonify({'error': 'No files selected'}), 400
        
        # Create batch job
        bp = get_batch_processor()
        batch_id = bp.create_batch_job(batch_name, len(files))
        
        # Save files and create projects
        project_ids = []
        
        for file in files:
            if file.filename == '':
                continue
            
            # Save uploaded file
            filename = file.filename
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            
            # Handle duplicate filenames
            base, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(filepath):
                filename = f"{base}_{counter}{ext}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                counter += 1
            
            file.save(filepath)
            
            # Create project
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO projects (filename, filepath, status)
                VALUES (?, ?, 'upload')
            ''', (filename, filepath))
            
            project_id = cursor.lastrowid
            
            # Create files entry
            cursor.execute('''
                INSERT INTO files (project_id, original_path)
                VALUES (?, ?)
            ''', (project_id, filepath))
            
            # Create empty OCR text entry
            cursor.execute('''
                INSERT INTO ocr_text (project_id)
                VALUES (?)
            ''', (project_id,))
            
            conn.commit()
            conn.close()
            
            # Add to batch
            bp.add_batch_item(batch_id, project_id)
            project_ids.append(project_id)
        
        return jsonify({
            'success': True,
            'batch_id': batch_id,
            'batch_name': batch_name,
            'files_uploaded': len(project_ids),
            'project_ids': project_ids
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/<int:batch_id>/start', methods=['POST'])
def start_batch_processing(batch_id):
    """
    Start batch OCR processing
    """
    try:
        bp = get_batch_processor()
        
        # Define OCR callback function
        def ocr_callback(project_id):
            """Process OCR for a single project"""
            try:
                # Get project data
                project = get_project_data(project_id)
                if not project:
                    return False, "Project not found"
                
                filepath = project.get('filepath', '')
                if not filepath or not os.path.exists(filepath):
                    return False, "File not found"
                
                # Extract text based on file type
                extracted_text = ""
                file_ext = os.path.splitext(filepath)[1].lower()
                
                # Handle text files masquerading as PDFs
                if file_ext == '.pdf' and is_text_file(filepath):
                    try:
                        converted = convert_text_file_to_pdf(filepath)
                        if converted:
                            with open(filepath, 'rb') as file:
                                pdf_reader = PyPDF2.PdfReader(file)
                                for page in pdf_reader.pages:
                                    extracted_text += page.extract_text() + "\n\n"
                        else:
                            extracted_text = extract_text_from_text_file(filepath)
                    except Exception as e:
                        extracted_text = extract_text_from_text_file(filepath)
                
                elif file_ext == '.pdf':
                    try:
                        with open(filepath, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            for page in pdf_reader.pages:
                                extracted_text += page.extract_text() + "\n\n"
                        
                        if not extracted_text.strip():
                            extracted_text = "No text found in PDF."
                    except Exception as e:
                        return False, f"PDF extraction error: {str(e)}"
                
                elif file_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
                    try:
                        if check_tesseract():
                            image = Image.open(filepath)
                            extracted_text = pytesseract.image_to_string(image)
                            
                            if not extracted_text.strip():
                                extracted_text = "No text detected in image."
                        else:
                            return False, "Tesseract OCR not installed"
                    except Exception as e:
                        return False, f"Image OCR error: {str(e)}"
                
                else:
                    return False, f"Unsupported file type: {file_ext}"
                
                # Save extracted text
                conn = get_db()
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE ocr_text 
                    SET original_text = ?
                    WHERE project_id = ?
                ''', (extracted_text, project_id))
                
                cursor.execute('''
                    UPDATE projects 
                    SET status = 'cleanup', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (project_id,))
                
                # Update search index
                update_search_index(project_id, conn)

                conn.commit()
                conn.close()
                
                return True, None
                
            except Exception as e:
                return False, str(e)
        
        # Start batch processing in background
        bp.start_batch_processing_async(batch_id, ocr_callback)
        
        return jsonify({
            'success': True,
            'message': 'Batch processing started'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/<int:batch_id>/status', methods=['GET'])
def get_batch_status_endpoint(batch_id):
    """
    Get batch processing status
    """
    try:
        print(f"📊 Getting status for batch {batch_id}")
        bp = get_batch_processor()
        status = bp.get_batch_status(batch_id)
        
        if not status:
            print(f"❌ Batch {batch_id} not found")
            return jsonify({'error': 'Batch not found'}), 404
        
        print(f"✅ Batch {batch_id} status retrieved successfully")
        return jsonify(status)
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ Error getting batch status: {error_msg}")
        traceback.print_exc()
        return jsonify({'error': error_msg, 'details': traceback.format_exc()}), 500

@app.route('/api/batch/<int:batch_id>/cancel', methods=['POST'])
def cancel_batch_endpoint(batch_id):
    """
    Cancel batch processing
    """
    try:
        bp = get_batch_processor()
        success = bp.cancel_batch(batch_id)
        
        return jsonify({
            'success': success,
            'message': 'Batch cancelled'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/list', methods=['GET'])
def list_batches():
    """
    Get all batch jobs
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        
        bp = get_batch_processor()
        batches = bp.get_all_batches(limit)
        
        return jsonify({
            'batches': batches
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/<int:batch_id>', methods=['DELETE'])
def delete_batch_endpoint(batch_id):
    """
    Delete a batch job
    """
    try:
        bp = get_batch_processor()
        success = bp.delete_batch(batch_id)
        
        return jsonify({
            'success': success,
            'message': 'Batch deleted'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch/bulk-metadata', methods=['POST'])
def apply_bulk_metadata():
    """Update metadata for multiple projects at once with support for prefix/suffix"""
    try:
        data = request.json
        project_ids = data.get('project_ids', [])
        metadata = data.get('metadata', {})
        title_mods = data.get('title_modifications', {})
        
        if not project_ids:
            return jsonify({'error': 'No projects selected'}), 400
            
        conn = get_db()
        cursor = conn.cursor()
        
        updated_count = 0
        
        for pid in project_ids:
            # Check existing
            cursor.execute("SELECT * FROM metadata WHERE project_id = ?", (pid,))
            existing = cursor.fetchone()
            
            # Construct update values
            # If a field is provided in 'metadata' dict, use it. Otherwise keep existing.
            
            # Get current title to apply modifications
            cursor.execute("SELECT title, filename FROM projects LEFT JOIN metadata ON projects.id = metadata.project_id WHERE projects.id = ?", (pid,))
            proj = cursor.fetchone()
            current_title = proj[0] if proj and proj[0] else (proj[1] if proj else "")
            
            # Apply title mods
            new_title = current_title
            # If a direct title is provided in metadata, it overrides modifications unless modifications are explicit
            if metadata.get('title'):
                new_title = metadata.get('title')
                
            if title_mods.get('prefix') or title_mods.get('suffix'):
                prefix = title_mods.get('prefix', '')
                suffix = title_mods.get('suffix', '')
                new_title = f"{prefix}{new_title}{suffix}"
            
            # Prepare fields
            author = metadata.get('author') # None if not set
            year = metadata.get('year')
            subject = metadata.get('subject')
            keywords = metadata.get('keywords')
            
            if existing:
                # Update
                update_query = "UPDATE metadata SET "
                params = []
                
                # Always update title if it changed due to prefix/suffix or direct set
                if new_title != current_title or metadata.get('title'):
                    update_query += "title = ?, "
                    params.append(new_title)
                
                if author is not None:
                    update_query += "author = ?, "
                    params.append(author)
                    
                if year is not None:
                    update_query += "year = ?, "
                    params.append(year)
                    
                if subject is not None:
                    update_query += "subject = ?, "
                    params.append(subject)
                    
                if keywords is not None:
                    update_query += "keywords = ?, "
                    params.append(keywords)
                    
                # Remove trailing comma
                if params:
                    update_query = update_query.rstrip(', ')
                    update_query += " WHERE project_id = ?"
                    params.append(pid)
                    cursor.execute(update_query, params)
                    updated_count += 1
                    
            else:
                # Insert
                # Use provided values or defaults/existing fallback
                final_title = new_title
                final_author = author if author is not None else ""
                final_year = year if year is not None else ""
                final_subject = subject if subject is not None else "General"
                final_keywords = keywords if keywords is not None else ""
                
                cursor.execute('''
                    INSERT INTO metadata (project_id, title, author, year, subject, keywords)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (pid, final_title, final_author, final_year, final_subject, final_keywords))
                updated_count += 1
            
            # Update status to 'archived' as this is the final step
            cursor.execute("UPDATE projects SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pid,))
                
            update_search_index(pid, conn)
            
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'message': f"Updated metadata for {updated_count} projects"
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500



def init_search_index():
    """Initialize Full-Text Search (FTS5) table"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Check if FTS5 is supported
        cursor.execute('pragma compile_options')
        options = [row[0] for row in cursor.fetchall()]
        if 'ENABLE_FTS5' not in options:
            print("⚠️ SQLite FTS5 not enabled. Search capabilities will be limited.")
            return

        # Create virtual table for search
        # We index title, content (OCR text), author, and keywords
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                project_id UNINDEXED,
                title,
                author,
                content,
                keywords,
                tokenize = 'porter'
            )
        ''')
        
        # Check if index is empty
        cursor.execute('SELECT count(*) FROM search_index')
        if cursor.fetchone()[0] == 0:
            print("building search index...")
            rebuild_search_index(conn)
            
        print("🔍 Search Index initialized")
        
    except Exception as e:
        print(f"❌ Error initializing search index: {e}")
    finally:
        conn.commit()
        conn.close()

def rebuild_search_index(conn=None):
    """Rebuild the entire search index from existing data"""
    close_conn = False
    if not conn:
        conn = get_db()
        close_conn = True
        
    cursor = conn.cursor()
    
    # Clear existing index
    cursor.execute('DELETE FROM search_index')
    
    # Fetch all searchable data
    # Join projects, ocr_text, and metadata
    cursor.execute('''
        SELECT 
            p.id, 
            COALESCE(m.title, p.filename) as title,
            COALESCE(m.author, '') as author,
            COALESCE(o.original_text, '') as content,
            COALESCE(m.keywords, '') as keywords
        FROM projects p
        LEFT JOIN ocr_text o ON p.id = o.project_id
        LEFT JOIN metadata m ON p.id = m.project_id
        WHERE p.status != 'upload' 
    ''')
    
    rows = cursor.fetchall()
    
    # Batch insert
    for row in rows:
        cursor.execute('''
            INSERT INTO search_index (project_id, title, author, content, keywords)
            VALUES (?, ?, ?, ?, ?)
        ''', (row[0], row[1], row[2], row[3], row[4]))
        
    conn.commit()
    if close_conn:
        conn.close()

def update_search_index(project_id, conn=None):
    """Update search index for a single project"""
    close_conn = False
    if not conn:
        conn = get_db()
        close_conn = True
    
    try:
        cursor = conn.cursor()
        
        # Remove existing entry
        cursor.execute('DELETE FROM search_index WHERE project_id = ?', (project_id,))
        
        # Fetch fresh data
        cursor.execute('''
            SELECT 
                p.id, 
                COALESCE(m.title, p.filename) as title,
                COALESCE(m.author, '') as author,
                COALESCE(o.original_text, '') as content,
                COALESCE(m.keywords, '') as keywords
            FROM projects p
            LEFT JOIN ocr_text o ON p.id = o.project_id
            LEFT JOIN metadata m ON p.id = m.project_id
            WHERE p.id = ?
        ''', (project_id,))
        
        row = cursor.fetchone()
        if row:
            cursor.execute('''
                INSERT INTO search_index (project_id, title, author, content, keywords)
                VALUES (?, ?, ?, ?, ?)
            ''', (row['id'], row['title'], row['author'], row['content'], row['keywords']))
            
        conn.commit()
    except Exception as e:
        print(f"Error updating search index for {project_id}: {e}")
    finally:
        if close_conn:
            conn.close()

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get system-wide analytics and statistics"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        analytics = {}
        
        # 1. Project Status Counts
        cursor.execute('''
            SELECT status, COUNT(*) as count 
            FROM projects 
            GROUP BY status
        ''')
        status_counts = dict(cursor.fetchall())
        analytics['status_distribution'] = [
            {'name': 'Upload', 'value': status_counts.get('upload', 0)},
            {'name': 'OCR', 'value': status_counts.get('ocr', 0)},
            {'name': 'Cleanup', 'value': status_counts.get('cleanup', 0)},
            {'name': 'Metadata', 'value': status_counts.get('metadata', 0)},
            {'name': 'Archived', 'value': status_counts.get('archived', 0)}
        ]
        
        analytics['total_projects'] = sum(item['value'] for item in analytics['status_distribution'])
        
        # 2. Storage Usage (Approximation from file sizes)
        # Assuming we have access to files table or just checking uploads dir size? 
        # Better to query DB if we stored sizes, but we didn't explicitly store size in 'projects' table.
        # Let's count files in UPLOAD_FOLDER and ARCHIVE_FOLDER.
        
        total_size_bytes = 0
        file_count = 0
        
        def get_dir_size(path):
            total = 0
            count = 0
            try:
                for entry in os.scandir(path):
                    if entry.is_file():
                        total += entry.stat().st_size
                        count += 1
            except FileNotFoundError:
                pass
            return total, count

        upload_size, upload_count = get_dir_size(UPLOAD_FOLDER)
        archive_size, archive_count = get_dir_size(ARCHIVE_FOLDER)
        
        total_size_bytes = upload_size + archive_size
        analytics['storage_usage'] = {
            'total_bytes': total_size_bytes,
            'total_files': upload_count + archive_count,
            'formatted': f"{total_size_bytes / (1024*1024):.2f} MB" 
        }

        # 3. Subject Distribution (from Metadata)
        cursor.execute('''
            SELECT subject, COUNT(*) as count 
            FROM metadata 
            GROUP BY subject
            ORDER BY count DESC
            LIMIT 10
        ''')
        analytics['subjects'] = [{'name': row[0], 'value': row[1]} for row in cursor.fetchall()]
        
        # 4. Activity Timeline (Projects created in last 7 days)
        # SQLite 'date' function
        cursor.execute('''
            SELECT date(created_at) as day, COUNT(*) as count
            FROM projects
            WHERE created_at >= date('now', '-6 days')
            GROUP BY day
            ORDER BY day ASC
        ''')
        
        daily_activity = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Fill in missing days
        timeline = []
        for i in range(6, -1, -1):
            date_str = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            timeline.append({
                'day': datetime.strptime(date_str, '%Y-%m-%d').strftime('%a'), # Mon, Tue
                'date': date_str,
                'count': daily_activity.get(date_str, 0)
            })
            
        analytics['timeline'] = timeline
        
        conn.close()
        return jsonify(analytics)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        target_lang = data.get('target', 'en')
        source_lang = data.get('source', 'auto')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
            
        translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        return jsonify({'translated_text': translated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_confidence_from_image(image, lang='eng'):
    """Extract words with low confidence from an image"""
    try:
        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
        low_confidence_words = []
        n_boxes = len(data['level'])
        
        for i in range(n_boxes):
            # level 5 corresponds to words
            if data['level'][i] == 5:
                # filter out empty texts
                word = data['text'][i].strip()
                conf = data['conf'][i]
                
                # Check for valid word
                if word and conf != -1:
                    if conf < 80: # Threshold for highlighting
                        low_confidence_words.append({
                            'word': word,
                            'conf': conf
                        })
        return low_confidence_words
    except Exception as e:
        print(f"Error extracting confidence: {e}")
        return []

@app.route('/api/projects/<int:project_id>/searchable_pdf', methods=['GET'])
def download_searchable_pdf(project_id):
    """Download the auto-generated searchable PDF (Sandwich PDF)"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT ocr_path, filepath, filename FROM projects JOIN files ON projects.id = files.project_id WHERE projects.id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Project not found'}), 404
            
        original_filepath = row[1]
        filename_base = os.path.splitext(os.path.basename(original_filepath))[0]
        ocr_filename = f"ocr_{filename_base}.pdf"
        ocr_pdf_path = os.path.join(UPLOAD_FOLDER, ocr_filename)
        
        if os.path.exists(ocr_pdf_path):
            return send_file(ocr_pdf_path, as_attachment=True, download_name=f"Searchable_{row[2]}")
        else:
            return jsonify({'error': 'Searchable PDF not generated yet. Please Run OCR.'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    init_db()
    init_search_index()
    print("🚀 LibraDigit AI Backend Server")
    print("📊 Database initialized")
    print("🔍 Tesseract OCR:", "✓ Available" if check_tesseract() else "✗ Not found")
    print("🌐 Server running on http://localhost:5001")
    print("📅 Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("---")
    app.run(debug=True, port=5001)

