# Quick Start: Advanced OCR Features

## What's New?

LibraDigit AI now includes **Advanced OCR Analysis** with powerful document understanding capabilities!

### New Capabilities

🎯 **Automatic Page Orientation Correction** - No more manually rotating scanned pages!

📊 **Table Detection** - Automatically finds and extracts tables from documents

📝 **Form Recognition** - Detects checkboxes and text fields in forms

✍️ **Handwritten Text** - Better recognition of handwritten content

🏛️ **Page Structure** - Identifies headers, footers, stamps, and signatures

🖼️ **Enhanced Preprocessing** - Cleaner, sharper images for better OCR accuracy

## How to Use

### Step 1: Install Dependencies

```bash
cd backend
pip install opencv-python numpy
```

### Step 2: Upload Your Document

1. Open LibraDigit AI
2. Go to "Upload & OCR"
3. Upload an image file (PNG, JPG, TIFF, BMP)

### Step 3: Enable Advanced OCR

1. After uploading, you'll see the OCR settings
2. Toggle ON the **"Advanced OCR Analysis"** switch
3. You'll see a list of features that will be enabled

### Step 4: Run OCR

1. Select your language (default: English)
2. Click **"Run Advanced OCR"**
3. Wait for processing (may take a few seconds longer than standard OCR)

### Step 5: View Results

You'll see a comprehensive analysis including:
- Number of tables detected
- Checkboxes and text fields found
- Whether page orientation was corrected
- Stamps and signatures detected
- Total words extracted

## When to Use Advanced OCR?

✅ **Use Advanced OCR for:**
- Documents with tables or forms
- Rotated or skewed scans
- Documents with stamps or signatures
- Poor quality or degraded scans
- When you need maximum accuracy

⚡ **Use Standard OCR for:**
- Simple text-only documents
- High-quality scans
- When speed is critical
- PDF files with embedded text

## Example Results

### Before (Standard OCR)
```
Text extracted: 850 words
Processing time: 2 seconds
```

### After (Advanced OCR)
```
Text extracted: 850 words
Tables detected: 2
Checkboxes found: 5
Text fields found: 8
Stamps detected: 1
Signatures found: 1
Page orientation: Corrected (90° rotation)
Processing time: 6 seconds
```

## Tips for Best Results

1. **Image Quality Matters**
   - Use 300 DPI or higher
   - Ensure good lighting
   - Avoid shadows and glare

2. **File Format**
   - PNG or TIFF for best quality
   - High-quality JPEG (90+ quality)

3. **Document Preparation**
   - Flatten documents before scanning
   - Remove staples and bindings
   - Clean the scanner glass

## Troubleshooting

**Problem:** "Advanced OCR only supports image files"
**Solution:** Convert PDF pages to images first, or use standard OCR for PDFs

**Problem:** Tables not detected
**Solution:** Ensure tables have clear borders/lines. Borderless tables may not be detected.

**Problem:** Processing is slow
**Solution:** This is normal for advanced OCR. It performs multiple analysis passes for better results.

## What Happens Behind the Scenes?

When you run Advanced OCR, the system:

1. ✅ Checks if the page is rotated and corrects it
2. ✅ Enhances the image (denoise, sharpen, contrast)
3. ✅ Analyzes page structure (header, footer, body)
4. ✅ Detects tables using line detection
5. ✅ Finds form fields (checkboxes, text fields)
6. ✅ Looks for stamps and signatures
7. ✅ Extracts all text with layout understanding
8. ✅ Recognizes handwritten content if present

## Need Help?

- 📖 Full documentation: `ADVANCED_OCR_DOCUMENTATION.md`
- 🐛 Issues: Report on GitHub
- 💡 Feature requests: Open an issue

---

**Ready to digitize smarter? Enable Advanced OCR and see the difference!** ✨
