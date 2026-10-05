# LibraDigit AI - Setup Guide

## Quick Start

Follow these steps to get LibraDigit AI running on your system.

## Step 1: Install Prerequisites

### 1.1 Node.js
- Download from: https://nodejs.org/
- Install version 18 or higher
- Verify: `node --version`

### 1.2 Python
- Download from: https://www.python.org/downloads/
- Install version 3.8 or higher
- ✅ **Important**: Check "Add Python to PATH" during installation
- Verify: `python --version`

### 1.3 Tesseract OCR

#### Windows:
1. Download installer: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (tesseract-ocr-w64-setup-v5.x.x.exe)
3. Default installation path: `C:\Program Files\Tesseract-OCR`
4. Add to PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Environment Variables → System Variables → Path → Edit
   - Add: `C:\Program Files\Tesseract-OCR`
5. Verify: Open new terminal and run `tesseract --version`

#### macOS:
```bash
brew install tesseract
```

#### Linux:
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

## Step 2: Install Dependencies

### 2.1 Frontend Dependencies

Open terminal in project directory:

```bash
npm install
```

This will install:
- React and React Router
- Electron
- Vite
- Axios
- Lucide React icons
- All other frontend dependencies

### 2.2 Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

This will install:
- Flask and Flask-CORS
- Tesseract Python wrapper
- OCRmyPDF
- Pillow (image processing)
- PyMuPDF

## Step 3: Run the Application

### Option A: One Command (Recommended)

```bash
npm run dev
```

This starts everything automatically:
- ✅ React frontend (http://localhost:3000)
- ✅ Python backend (http://localhost:5000)
- ✅ Electron desktop window

### Option B: Manual Start

If you prefer to see each component separately:

**Terminal 1 - Backend:**
```bash
cd backend
python server.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev:react
```

**Terminal 3 - Electron:**
```bash
npx electron .
```

## Step 4: Verify Installation

1. The Electron window should open automatically
2. You should see the LibraDigit AI dashboard
3. Check the backend terminal for:
   ```
   🚀 LibraDigit AI Backend Server
   📊 Database initialized
   🔍 Tesseract OCR: ✓ Available
   🌐 Server running on http://localhost:5000
   ```

## Common Issues

### Issue: "npm: command not found"
**Solution**: Install Node.js and restart your terminal

### Issue: "python: command not found"
**Solution**: Install Python and ensure it's added to PATH

### Issue: "Tesseract OCR: ✗ Not found"
**Solution**: 
1. Install Tesseract OCR
2. Add to system PATH
3. Restart terminal
4. Verify: `tesseract --version`

### Issue: "Port 3000 already in use"
**Solution**: 
1. Kill the process using port 3000
2. Or change port in `vite.config.js`

### Issue: "Port 5000 already in use"
**Solution**: 
1. Kill the process using port 5000
2. Or change port in `backend/server.py`

### Issue: Backend errors on Windows
**Solution**: 
1. Ensure Python is in PATH
2. Try: `python -m pip install -r backend/requirements.txt`
3. Run backend with: `python backend/server.py`

## First Project Workflow

Once the app is running:

1. **Click "Start New Project"**
2. **Upload a document** (PDF or image)
3. **Run OCR** - Wait for processing
4. **Clean text** - Review and correct errors
5. **Add metadata** - Fill in title, author, etc.
6. **Generate archive** - Create organized archive

Your first document is now digitized! 🎉

## File Locations

- **Database**: `libradigit.db` (created automatically)
- **Uploads**: `uploads/` folder
- **Archives**: `Archive/` folder with structure:
  ```
  Archive/
    └── Subject/
        └── Year/
            └── Author_Year_Title.pdf
  ```

## Development Tips

- **Hot Reload**: Frontend changes reload automatically
- **Backend Changes**: Restart `python server.py`
- **Database Reset**: Delete `libradigit.db` to start fresh
- **Clear Projects**: Delete `Archive/` and `uploads/` folders

## Next Steps

- Read the full README.md for detailed documentation
- Try the complete workflow with a sample document
- Explore the metadata and archive features
- Check out the workflow tracker

## Need Help?

- Check the troubleshooting section in README.md
- Verify all prerequisites are installed correctly
- Ensure all services are running (frontend + backend)
- Check browser console and terminal for errors

---

**You're all set! Start digitizing your library collection! 📚**
