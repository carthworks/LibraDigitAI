# LibraDigit AI

**AI-Based Digitization & Digital Archive Builder for Libraries**

A production-grade desktop application that converts scanned documents into searchable, metadata-rich digital archives using a guided workflow.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

![LibraDigit AI Poster](ad_librDigitIT_2026.png)

## 🎯 Overview

LibraDigit AI is an offline-first desktop application designed for librarians, archivists, and digitization teams to:

- ✅ Convert scanned PDFs/images to searchable documents using OCR.
- ✅ **Automatic Scanned PDF Detection** - Intelligently detects image-based PDFs and applies OCR automatically.
- ✅ **Advanced OCR with AI-powered layout analysis** - Detect tables, forms, signatures, and page structure.
- ✅ **Handwritten text to PDF conversion** - Transform handwritten notes into formatted, searchable PDFs.
- ✅ Clean and improve OCR text accuracy.
- ✅ Add comprehensive metadata (title, author, year, subject, keywords).
- ✅ Generate structured digital archives with organized folder hierarchies.
- ✅ **Search** across an entire archive using a dedicated Full-Text Search engine.
- ✅ **Analyze** digitization progress with a built-in statistics dashboard.

## 🚀 Key Features

### 🤖 Advanced OCR & AI Analysis
- **Scanned PDF OCR with Handwritten Support**: Automatically detects PDFs with embedded images and applies intelligent OCR. Switches to handwritten mode (LSTM) when handwriting is detected on any page.
- **Intelligent Layout Understanding**: Automatically detects page structure including headers, footers, stamps, and signatures.
- **Table & Form Extraction**: Identifies and extracts structured data from tables and form fields with checkbox detection.
- **Auto-Orientation Correction**: Automatically detects and corrects page rotation (0°, 90°, 180°, 270°).
- **Handwritten Text Recognition**: Specialized LSTM neural network for improved handwriting accuracy (75-92%).
- **Enhanced Preprocessing**: CLAHE enhancement, adaptive thresholding, and advanced denoising for better accuracy.
- **Handwritten to PDF**: Convert handwritten notes directly to professionally formatted, searchable PDF documents.

### 🔍 Extensive Search Facility
- **Full-Text Search (FTS5)**: Powered by SQLite's FTS5, search instantly through thousands of archived documents.
- **Content-Aware Snippets**: Search results show exactly where terms appear with keyword highlighting.
- **Universal Metadata Search**: Find documents by Title, Author, Keywords, or any content within the text.

### 📊 Analytics & Statistics
- **Workflow Visualization**: Track project distribution across Upload, OCR, Cleanup, Metadata, and Archived stages.
- **Storage Metrics**: Real-time tracking of disk space usage by your digital collection.
- **Activity Trends**: Weekly activity charts showing your digitization team's productivity.
- **Top Subjects**: Bar charts showcasing the most represented subjects in your archive.

### 🔒 Secure & Private
- **Secure Offline Auth**: Implements bcryptjs hashing for local authentication.
- **First-Run Setup**: Guided password setup on the first launch.
- **Privacy-First**: Zero cloud dependency; all data, hashes, and files stay exclusively on your local machine.

### 📱 Responsive & Modern UI
- **Responsive Design**: Optimized for everything from desktop monitors to mobile devices.
- **Multi-tab Synchronization**: Log out or delete a project in one browser tab, and all other tabs will instantly synchronize.
- **Premium Aesthetics**: High-end dark theme with smooth gradients and micro-animations.

### 📦 Archival Standards
- **BagIt Packaging**: Implements the international BagIt standard for robust, verifiable data packages.
- **XMP Metadata Embedding**: Metadata (Title, Author, etc.) is embedded directly into the PDF binary, traveling with the file even when shared.
- **MD5 Manifests**: Automatic integrity checks to ensure files remain uncorrupted over decades.

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

### Additional Dependencies for Advanced Features

4. **OpenCV** (for advanced image processing)
   - Installed automatically via `requirements.txt`
   - Required for: Advanced OCR, handwritten text recognition, table detection

5. **ReportLab** (for PDF generation)
   - Installed automatically via `requirements.txt`
   - Required for: Handwritten to PDF conversion

## 🛠️ Installation

### 1. Clone or Download the Project

```bash
cd "LibraDigit AI"
```

### 2. Install Dependencies

```bash
# Install frontend packages
npm install

# Install backend packages (includes OpenCV, NumPy, ReportLab)
cd backend
pip install -r requirements.txt
cd ..
```

## 🎮 Running the Application

### Development Mode

The easiest way to run the application is using the combined dev script:

```bash
npm run dev
```

This will:
- Start the React frontend (Vite)
- Start the Python backend (Flask)
- Launch the Electron desktop window

## 📖 Usage Guide

### Creating Your First Project

1. **Launch & Setup**: On first run, create your master password.
2. **Upload Document**: Drag and drop a PDF or image file (PDF, PNG, JPEG, TIFF). Scanned PDFs are automatically detected.
3. **Choose OCR Method**:
   - **Standard OCR**: Fast text extraction for printed documents and scanned PDFs
   - **Advanced OCR**: AI-powered analysis with table detection, form recognition, and layout understanding (images only)
   - **Handwritten to PDF**: Convert handwritten notes to formatted, searchable PDFs (images only)
4. **Run OCR**: Tesseract converts image text into a searchable layer. For scanned PDFs, pages are automatically rendered as images at 300 DPI.
5. **Clean Text**: Use the side-by-side rich text editor to correct OCR typos.
6. **Add Metadata**: Add descriptive details (Subject, Year, Author).
7. **Generate Archive**: The system builds the BagIt package and embeds your metadata.

### 🤖 Using Advanced OCR

For documents with complex layouts:

1. Upload your document (image format recommended)
2. Toggle **"Advanced OCR Analysis"** switch
3. Click **"Run Advanced OCR"**
4. View comprehensive results including:
   - Detected tables and their contents
   - Form fields and checkboxes (with fill status)
   - Page orientation corrections
   - Headers, footers, stamps, and signatures
   - Enhanced text extraction with layout preservation

### ✍️ Converting Handwritten Notes to PDF

For handwritten documents:

1. Upload a clear image of handwritten notes (300+ DPI recommended)
2. Select the appropriate language
3. Click **"Convert Handwritten to PDF"**
4. Receive a professionally formatted PDF with:
   - Extracted and structured text
   - Detected headings and paragraphs
   - Bullet points and lists
   - Diagrams and technical content
   - Complete metadata

### 📚 Installation Guide
For a detailed step-by-step visual guide on installing the Electron desktop application, please refer to:
`public/install_guide.html` (included in the distribution package).

This guide covers:
- System Requirements (Tesseract OCR)
- SmartScreen Security Bypass (for internal tools)
- First-time Account Setup

### Searching the Archive
Click **"Archive Search"** in the sidebar to perform lightning-fast keyword searches across your entire processed collection.

### Archive Structure (BagIt Standard)
Documents are organized using a standard preservation hierarchy:

```
Archive/
  └── Subject/
      └── Year/
          └── Author_Year_Title/
              ├── data/
              │   └── Author_Year_Title.pdf   (Final PDF with embedded metadata)
              ├── bag-info.txt                (Archive package metadata)
              └── manifest-md5.txt            (Checksums for file integrity)
```

## 🔧 Technology Stack

### Frontend & UI
- **React 18** (Vite)
- **Lucide React** (Icons)
- **Recharts** (Analytics)
- **Bcryptjs** (Local Auth)
- **Axios** (API)

### Desktop
- **Electron** (Cross-platform desktop engine)

### Backend & Engine
- **Flask** (Python API)
- **SQLite 3** (Database & FTS5 Search Engine)
- **Tesseract OCR** (Text Extraction with LSTM neural networks)
- **PyMuPDF (fitz)** (PDF rendering for scanned PDF OCR at 300 DPI)
- **OpenCV** (Advanced image processing & computer vision)
- **NumPy** (Numerical operations for image analysis)
- **PyPDF2 & ReportLab** (PDF Metadata, Generation & Manipulation)
- **Bagit-Python** (Packaging standard)

## 🎨 Project Structure

```
LibraDigit AI/
├── backend/                    # Flask server & OCR engines
│   ├── advanced_ocr_processor.py    # Advanced OCR with layout analysis
│   ├── handwritten_to_pdf.py        # Handwritten text converter
│   ├── metadata_extractor.py        # Metadata extraction
│   ├── batch_processor.py           # Batch operations
│   └── server.py                    # Main Flask API
├── src/
│   ├── components/             # UI elements (Charts, Loaders, Sidebar)
│   │   └── AdvancedOCRResults.jsx   # Advanced OCR results display
│   ├── pages/                  # Full views (Analytics, Search, Dashboard)
│   ├── context/                # Multi-tab sync & Global state
│   └── index.css               # Design system & Desktop/Mobile styles
├── Archive/                    # Final BagIt collections
├── Documentation/              # Feature documentation
│   ├── ADVANCED_OCR_DOCUMENTATION.md
│   ├── HANDWRITTEN_TO_PDF_DOCUMENTATION.md
│   └── QUICK_START_ADVANCED_OCR.md
├── package.json                # Frontend scripts
└── README.md                   # This guide
```

## 📚 Additional Documentation

- **[Advanced OCR Documentation](ADVANCED_OCR_DOCUMENTATION.md)** - Complete guide to advanced OCR features
- **[Handwritten to PDF Guide](HANDWRITTEN_TO_PDF_DOCUMENTATION.md)** - Handwritten text conversion documentation
- **[Quick Start Guide](QUICK_START_ADVANCED_OCR.md)** - Get started with advanced features quickly
- **[JSON Serialization Fix](JSON_SERIALIZATION_FIX.md)** - Technical troubleshooting guide

---

**Built with ❤️ for librarians and archivists worldwide | github.com/carthworks**
