from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
import pytesseract
from PIL import Image
import PyPDF2
import mimetypes


app = Flask(__name__)
CORS(app)

# Configuration
DATABASE = 'libradigit.db'
UPLOAD_FOLDER = 'uploads'
ARCHIVE_FOLDER = 'Archive'

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
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    ''')
    
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
    
    conn.close()
    return project_dict

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
        }
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
            # Fallback to sample text if file doesn't exist
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
        
        # Extract text based on file type
        extracted_text = ""
        file_ext = os.path.splitext(filepath)[1].lower()
        
        # First, check if it's actually a text file masquerading as a PDF
        if file_ext == '.pdf' and is_text_file(filepath):
            # Automatically convert text file to proper PDF
            print(f"📄 Detected text file with .pdf extension: {filepath}")
            print(f"🔄 Auto-converting to proper PDF format...")
            
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
                                extracted_text += page.extract_text() + "\n\n"
                            
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
                with open(filepath, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    num_pages = len(pdf_reader.pages)
                    
                    for page_num in range(num_pages):
                        page = pdf_reader.pages[page_num]
                        extracted_text += page.extract_text() + "\n\n"
                    
                    if not extracted_text.strip():
                        extracted_text = "No text found in PDF. The PDF might be scanned images. Please use Tesseract OCR for image-based PDFs."
                    
                file_type_msg = "PDF"
                        
            except Exception as e:
                extracted_text = f"Error extracting text from PDF: {str(e)}\n\nPlease ensure the PDF is not corrupted."
                file_type_msg = "PDF (error)"
        
        elif file_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
            # Extract text from image using Tesseract
            try:
                if check_tesseract():
                    image = Image.open(filepath)
                    extracted_text = pytesseract.image_to_string(image)
                    
                    if not extracted_text.strip():
                        extracted_text = "No text detected in image. Please ensure the image contains readable text."
                else:
                    extracted_text = """Tesseract OCR is not installed.

To extract text from images, please install Tesseract OCR:
- Windows: https://github.com/UB-Mannheim/tesseract/wiki
- macOS: brew install tesseract
- Linux: sudo apt-get install tesseract-ocr

For now, here's sample text to demonstrate the workflow."""
                
                file_type_msg = "image"
            except Exception as e:
                extracted_text = f"Error extracting text from image: {str(e)}"
                file_type_msg = "image (error)"
        
        else:
            extracted_text = f"Unsupported file type: {file_ext}\n\nSupported formats: PDF, PNG, JPG, JPEG, TIFF, BMP"
            file_type_msg = f"unsupported ({file_ext})"
        
        # Save extracted text to database
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
        return jsonify({'error': str(e)}), 500

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
        
        # Create filename
        filename_parts = []
        if author:
            filename_parts.append(author)
        if year:
            filename_parts.append(year)
        filename_parts.append(title)
        
        filename = '_'.join(filename_parts) + '.pdf'
        
        # Create directory structure
        archive_path = os.path.join(ARCHIVE_FOLDER, subject, year)
        os.makedirs(archive_path, exist_ok=True)
        
        final_path = os.path.join(archive_path, filename)
        
        # In production, this would copy/move the actual processed PDF
        # For demo, we'll just create a placeholder
        with open(final_path, 'w') as f:
            f.write(f"Archive file for: {title}\n")
            f.write(f"Author: {author}\n")
            f.write(f"Year: {year}\n")
            f.write(f"Subject: {subject}\n")
        
        # Update database
        conn = get_db()
        cursor = conn.cursor()
        
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

if __name__ == '__main__':
    init_db()
    print("🚀 LibraDigit AI Backend Server")
    print("📊 Database initialized")
    print("🔍 Tesseract OCR:", "✓ Available" if check_tesseract() else "✗ Not found")
    print("🌐 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)
