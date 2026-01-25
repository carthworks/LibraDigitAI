# LibraDigit AI

**AI-Based Digitization & Digital Archive Builder for Libraries**

A production-grade desktop application that converts scanned documents into searchable, metadata-rich digital archives using a guided workflow.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

![LibraDigit AI Poster](ad_librDigitIT_2026.png)

## 🎯 Overview

LibraDigit AI is an offline-first desktop application designed for librarians, archivists, and digitization teams to:

- ✅ Convert scanned PDFs/images to searchable documents using OCR
- ✅ Clean and improve OCR text accuracy
- ✅ Add comprehensive metadata (title, author, year, subject, keywords)
- ✅ Generate structured digital archives with organized folder hierarchies
- ✅ Track workflow progress through a 5-step guided process

## 🚀 Features

### Core Workflow

1. **Upload & OCR** - Upload scanned documents and run OCR processing
2. **Text Cleanup** - Review and correct OCR errors
3. **Metadata Entry** - Add searchable metadata
4. **Archive Generation** - Create structured digital archives
5. **Progress Tracking** - Visual workflow tracker

### Key Capabilities

- 🔍 **OCR Processing** - Tesseract-powered text extraction
- 📄 **Searchable PDFs** - Generates high-fidelity "Image-over-Text" PDFs that preserve original layout while being fully searchable
- 📝 **Text Editor** - Side-by-side cleanup interface
- 📊 **Metadata Management** - Comprehensive metadata forms
- 📁 **Archive Structure** - Automatic folder organization: `/Archive/Subject/Year/Author_Year_Title.pdf`
- 💾 **Persistent Storage** - SQLite database for project management
- 🎨 **Modern UI** - Premium dark theme with smooth animations
- 🔒 **Offline-First** - No cloud dependency, complete data privacy

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/

2. **Python** (v3.8 or higher)
   - Download: https://www.python.org/downloads/

3. **Tesseract OCR** (for OCR functionality)
   - **Windows**: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`

## 🛠️ Installation

### 1. Clone or Download the Project

```bash
cd "c:\Users\tkart\Dev\products\LibraDigit AI"
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 4. Verify Tesseract Installation

```bash
tesseract --version
```

If Tesseract is not found, install it following the prerequisites section.

## 🎮 Running the Application

### Development Mode

The easiest way to run the application is using the combined dev script:

```bash
npm run dev
```

This will:
- Start the React frontend (http://localhost:3000)
- Start the Python backend (http://localhost:5000)
- Launch the Electron desktop window

### Manual Start (Alternative)

If you prefer to run components separately:

**Terminal 1 - Backend:**
```bash
npm run dev:python
```

**Terminal 2 - Frontend:**
```bash
npm run dev:react
```

**Terminal 3 - Electron:**
```bash
npx electron .
```

## 📖 Usage Guide

### Creating Your First Project

1. **Launch the Application**
   - Click "Start New Project" on the dashboard

2. **Upload Document**
   - Drag and drop a PDF or image file
   - Supported formats: PDF, PNG, JPEG, TIFF
   - Click "Upload and Process"

3. **Run OCR**
   - The system will automatically process the document
   - Wait for OCR completion

4. **Clean Text**
   - Review the extracted text
   - Correct any OCR errors
   - Save your changes

5. **Add Metadata**
   - Enter title (required)
   - Add author, year, subject, keywords
   - Preview the archive path

6. **Generate Archive**
   - Review the folder structure
   - Click "Generate Archive File"
   - Your document is now archived!

### Archive Structure

Documents are organized as:

```
Archive/
  └── Subject/
      └── Year/
          └── Author_Year_Title.pdf
```

Example:
```
Archive/
  └── History/
      └── 2023/
          └── Smith_2023_Ancient_Civilizations.pdf
```

## 🗄️ Database Schema

The application uses SQLite with the following tables:

- **projects** - Project information and status
- **files** - File paths (original, OCR, cleaned, final)
- **metadata** - Document metadata
- **ocr_text** - Original and cleaned OCR text

## 🎨 Design Philosophy

- **Premium UI** - Modern dark theme with vibrant gradients
- **User Guidance** - Clear error messages and helpful hints
- **Workflow Focus** - Linear 5-step process
- **Offline-First** - No internet required
- **Data Privacy** - All data stays local

## 🔧 Technology Stack

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Axios** - API communication
- **Lucide React** - Icon library
- **Vite** - Build tool

### Desktop
- **Electron** - Desktop application wrapper

### Backend
- **Flask** - Python web framework
- **SQLite** - Database
- **Tesseract OCR** - Text extraction
- **OCRmyPDF** - PDF processing
- **Pillow** - Image processing

## 📁 Project Structure

```
LibraDigit AI/
├── backend/
│   ├── server.py           # Flask API server
│   └── requirements.txt    # Python dependencies
├── electron/
│   └── main.js            # Electron main process
├── src/
│   ├── components/        # React components
│   ├── context/          # State management
│   ├── pages/            # Page components
│   ├── App.jsx           # Main app component
│   ├── index.css         # Design system
│   └── main.jsx          # React entry point
├── Archive/              # Generated archives
├── uploads/              # Uploaded files
├── index.html           # HTML entry point
├── package.json         # Node dependencies
├── vite.config.js       # Vite configuration
└── README.md           # This file
```

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: "Unable to fetch projects"

**Solution**: Ensure Python backend is running:
```bash
cd backend
python server.py
```

### Tesseract Not Found

**Error**: "OCR engine not found"

**Solution**: Install Tesseract OCR and add to PATH:
- Windows: Add Tesseract installation folder to system PATH
- Verify: `tesseract --version`

### Port Already in Use

**Error**: "Port 3000/5000 already in use"

**Solution**: Kill the process or change ports in:
- Frontend: `vite.config.js`
- Backend: `server.py`

### Failed to Load PDF Document

**Error**: "Failed to load PDF document"

**Cause**: File is actually a plain text file with a `.pdf` extension

**Solutions**:

1. **Automatic Handling** (Recommended):
   - Simply upload the file through LibraDigit AI
   - The system automatically detects and handles text files
   - Text content will be extracted normally

2. **Manual Conversion**:
   ```bash
   cd backend
   # Convert single file
   python convert_text_to_pdf.py "path/to/file.pdf"
   
   # Convert entire Archive directory
   python convert_text_to_pdf.py "Archive/"
   ```

**More Info**: See `HANDLING_TEXT_PDF_FILES.md` for detailed documentation

## 🚀 Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a production tool designed for library digitization workflows. Contributions are welcome!

## 📧 Support

For issues or questions, please create an issue in the repository.

## 🎓 Training Mode

LibraDigit AI includes a training mode feature (coming soon) that:
- Provides guided tooltips at each step
- Enforces workflow order
- Generates project reports
- Tracks time saved

This makes it both a **learning platform** and a **digitization system**.

## 📊 Success Metrics

- ⏱️ Convert 10-page scan → searchable PDF in < 3 minutes
- 📝 Metadata creation in < 2 minutes
- 🔒 Zero dependency on external SaaS
- 👥 Librarians can complete workflow without technical help

---

**Built with ❤️ for librarians and archivists worldwide**
