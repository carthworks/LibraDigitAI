# How to Add Tesseract OCR to Windows PATH

## 📥 Step 1: Download and Install Tesseract

1. **Download Tesseract OCR for Windows:**
   - Visit: https://github.com/UB-Mannheim/tesseract/wiki
   - Download the latest installer (e.g., `tesseract-ocr-w64-setup-v5.x.x.exe`)

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Click "Next" through the installation wizard
   - **Important:** Note the installation path (usually `C:\Program Files\Tesseract-OCR`)
   - Complete the installation

## 🛠️ Step 2: Add Tesseract to System PATH

### Method 1: Using System Properties (Recommended)

1. **Open System Properties:**
   - Press `Windows Key + R` to open Run dialog
   - Type: `sysdm.cpl`
   - Press Enter

2. **Access Environment Variables:**
   - Click on the "Advanced" tab
   - Click "Environment Variables" button at the bottom

3. **Edit PATH Variable:**
   - In the "System variables" section (bottom half), find and select "Path"
   - Click "Edit..."

4. **Add Tesseract Path:**
   - Click "New"
   - Add: `C:\Program Files\Tesseract-OCR`
   - Click "OK"
   - Click "OK" again
   - Click "OK" to close System Properties

### Method 2: Using Settings (Windows 10/11)

1. **Open Settings:**
   - Press `Windows Key`
   - Type "environment variables"
   - Click "Edit the system environment variables"

2. **Follow steps 2-4 from Method 1 above**

### Method 3: Using PowerShell (Advanced)

```powershell
# Run PowerShell as Administrator
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Tesseract-OCR", "Machine")
```

## ✅ Step 3: Verify Installation

1. **Open a NEW Command Prompt or PowerShell:**
   - Press `Windows Key + R`
   - Type: `cmd` or `powershell`
   - Press Enter
   - **Important:** Must be a NEW window (close old ones)

2. **Test Tesseract:**
   ```bash
   tesseract --version
   ```

3. **Expected Output:**
   ```
   tesseract v5.x.x
   leptonica-1.x.x
   ...
   ```

4. **If you see version info:** ✅ Success! Tesseract is installed and in PATH

5. **If you see "not recognized":** ❌ Try these fixes:
   - Make sure you opened a NEW terminal window
   - Verify the installation path is correct
   - Restart your computer
   - Check if Tesseract is installed at `C:\Program Files\Tesseract-OCR`

## 🔄 Step 4: Restart Backend Server

After adding Tesseract to PATH:

1. **Stop the backend server:**
   - Go to the terminal running `python server.py`
   - Press `Ctrl + C`

2. **Start it again:**
   ```bash
   cd backend
   python server.py
   ```

3. **Check the output:**
   You should see:
   ```
   🚀 LibraDigit AI Backend Server
   📊 Database initialized
   🔍 Tesseract OCR: ✓ Available  ← Should show checkmark now!
   🌐 Server running on http://localhost:5000
   ```

## 🎯 Common Installation Paths

Tesseract is usually installed at one of these locations:

- `C:\Program Files\Tesseract-OCR`
- `C:\Program Files (x86)\Tesseract-OCR`
- `C:\Users\[YourUsername]\AppData\Local\Programs\Tesseract-OCR`

**Make sure to add the correct path to your PATH variable!**

## 🐛 Troubleshooting

### Issue: "tesseract is not recognized"

**Solution 1:** Restart your terminal
- Close ALL terminal windows
- Open a new one
- Try `tesseract --version` again

**Solution 2:** Check installation path
```bash
# Check if Tesseract exists
dir "C:\Program Files\Tesseract-OCR\tesseract.exe"
```

**Solution 3:** Manually set PATH in Python (Temporary)
Edit `backend/server.py` and add at the top:
```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

**Solution 4:** Restart your computer
- Sometimes Windows needs a restart for PATH changes to take effect

### Issue: Backend still shows "Tesseract OCR: ✗ Not found"

1. Verify Tesseract is in PATH:
   ```bash
   tesseract --version
   ```

2. Restart the backend server (Ctrl+C, then `python server.py`)

3. Check Python can find it:
   ```bash
   python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
   ```

## 📝 Quick Reference

### Full Installation Steps:
1. ✅ Download Tesseract installer
2. ✅ Run installer (note installation path)
3. ✅ Add to PATH: `C:\Program Files\Tesseract-OCR`
4. ✅ Open NEW terminal
5. ✅ Test: `tesseract --version`
6. ✅ Restart backend server
7. ✅ Upload image and test OCR

### PATH Variable Format:
```
C:\Program Files\Tesseract-OCR
```
(No trailing slash, no quotes)

---

## 🎉 After Installation

Once Tesseract is installed and in PATH:

1. **Upload an image file** (PNG, JPG, etc.)
2. **Click "Run OCR"**
3. **See real extracted text** from your image!

The application will now extract actual text from scanned images using Tesseract OCR! 🚀

---

**Need Help?** Check the BACKEND_GUIDE.md for more troubleshooting tips.
