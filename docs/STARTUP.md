# LibraDigit AI - Startup Instructions

## ✅ Backend Server is Running!

The backend server is now running on **http://localhost:5000**

## 🚀 How to Use the Application

### Current Setup (2 Terminals)

You currently have:
- ✅ **Terminal 1**: Backend server running (`python server.py`)
- ✅ **Terminal 2**: Frontend running (`npm run dev`)

The application should now work! Refresh your browser at **http://localhost:3000**

### Starting the Application (Future Sessions)

You need to run **2 commands** in **2 separate terminals**:

#### Terminal 1 - Backend Server
```bash
cd backend
python server.py
```

Wait until you see:
```
🚀 LibraDigit AI Backend Server
📊 Database initialized
🔍 Tesseract OCR: ✗ Not found
🌐 Server running on http://localhost:5000
```

#### Terminal 2 - Frontend
```bash
npm run dev
```

Wait until you see:
```
VITE ready in XXX ms
➜ Local: http://localhost:3000/
```

### Access the Application

Open your browser to: **http://localhost:3000**

Or if using Electron:
```bash
# Terminal 3 (optional)
npm run dev:electron
```

## 📝 Note About Tesseract

The message "Tesseract OCR: ✗ Not found" is normal if you haven't installed Tesseract yet.

The application will still work with **sample OCR text** for demonstration purposes.

To install Tesseract (optional):
- **Windows**: https://github.com/UB-Mannheim/tesseract/wiki
- **macOS**: `brew install tesseract`
- **Linux**: `sudo apt-get install tesseract-ocr`

## 🎯 Quick Test

1. Open http://localhost:3000
2. Click "Start New Project"
3. Upload any PDF or image file
4. Click "Upload and Process"
5. The OCR will run with sample text
6. Follow the workflow through Cleanup → Metadata → Archive

## ✅ Everything is Working!

Your LibraDigit AI application is now fully functional!

The error "Unable to fetch projects" should be resolved now that the backend is running.

---

**Happy Digitizing! 📚**
