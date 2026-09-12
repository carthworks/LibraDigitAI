# Handwritten Text Processing Guide

## Quick Reference: Which Feature to Use?

### For Scanned PDFs with Handwritten Text ✅ RECOMMENDED

**Use: "Run OCR" Button**

- ✅ Automatically detects handwritten text
- ✅ Processes all pages in the PDF
- ✅ Switches to handwritten mode (LSTM) when needed
- ✅ Works with mixed printed/handwritten pages
- ✅ Provides detailed console feedback

**Example**: Medical forms, legal documents, signed contracts, filled applications

---

### For Direct Handwritten Image Files

**Use: "Convert Handwritten Image to PDF" Button**

- ✅ Converts single image to formatted PDF
- ✅ Specialized handwritten text processing
- ✅ Professional PDF output with metadata
- ✅ Best for standalone handwritten notes

**Example**: Handwritten notes photos, whiteboard captures, sketch notes

---

## Detailed Workflows

### Workflow 1: Scanned PDF with Handwriting

1. **Upload** your scanned PDF
2. **Select Language** (e.g., English, Spanish, etc.)
3. **Click "Run OCR"**
4. **System automatically**:
   - Renders each page at 300 DPI
   - Tries standard OCR first
   - Switches to handwritten mode if needed
   - Shows "✍️ Handwritten text detected" in console
5. **Review** extracted text in Cleanup page
6. **Continue** with metadata and archiving

**Console Output Example**:
```
⚠️ Minimal text found in PDF, attempting OCR as scanned document...
📄 Processing 5 pages with OCR...
  Page 1: Standard OCR (printed text)
  Page 2: Trying handwritten OCR mode...
  ✍️ Handwritten text detected on page 2
  Page 3: Trying handwritten OCR mode...
  ✍️ Handwritten text detected on page 3
✅ OCR completed successfully
```

---

### Workflow 2: Handwritten Image to PDF

1. **Upload** your handwritten image (PNG, JPG, etc.)
2. **Select Language**
3. **Click "Convert Handwritten Image to PDF"**
4. **System**:
   - Extracts handwritten text using LSTM
   - Detects structure (headings, paragraphs, lists)
   - Creates formatted PDF with metadata
5. **Review** the generated PDF
6. **Continue** with metadata and archiving

---

## Feature Comparison

| Feature | Run OCR | Convert Handwritten Image to PDF |
|---------|---------|-----------------------------------|
| **Input** | PDF (scanned) or Images | Images only (PNG, JPG, TIFF) |
| **Multi-page** | ✅ Yes (all pages) | ❌ No (single image) |
| **Auto Handwriting Detection** | ✅ Yes (per page) | ✅ Yes (always) |
| **Mixed Content** | ✅ Yes (printed + handwritten) | ✅ Yes |
| **Output** | Extracted text | Formatted PDF + text |
| **Best For** | Scanned documents, forms | Standalone notes, photos |

---

## Tips for Best Results

### For Scanned PDFs
1. **Scan Quality**: 300 DPI or higher
2. **File Format**: PDF with embedded images
3. **Page Orientation**: Ensure pages are upright
4. **Language**: Select correct language before OCR
5. **Mixed Content**: System handles automatically

### For Handwritten Images
1. **Image Quality**: Clear, well-lit photos
2. **Contrast**: Dark writing on light background
3. **Legibility**: Neat, well-formed handwriting
4. **Resolution**: Higher resolution = better accuracy
5. **Format**: PNG or JPG recommended

---

## Common Questions

### Q: Can I use "Run OCR" for handwritten PDFs?
**A: Yes!** This is the recommended approach. The system automatically detects handwriting and switches to the appropriate OCR mode.

### Q: Why is "Convert Handwritten Image to PDF" disabled for PDFs?
**A: By design.** This feature is optimized for direct image files. For scanned PDFs (even with handwriting), use "Run OCR" which provides better multi-page support.

### Q: What if my PDF has both printed and handwritten text?
**A: Use "Run OCR".** It intelligently processes each page and automatically switches between standard and handwritten OCR modes as needed.

### Q: How accurate is handwritten text recognition?
**A: 75-92% for clear handwriting**, 50-75% for poor quality. Accuracy depends on:
- Handwriting legibility
- Scan/image quality
- Contrast and lighting
- Language selection

### Q: Can I process multiple handwritten images at once?
**A: Yes, using Batch Processing.** Upload multiple images and create a batch job. Each will be processed individually.

---

## Troubleshooting

### Issue: "No text found in PDF"
**Solution**: 
- Ensure PDF contains actual images (not blank pages)
- Check if Tesseract is installed
- Verify language selection is correct

### Issue: Poor handwriting recognition
**Solution**:
- Rescan at higher resolution (300+ DPI)
- Ensure good lighting and contrast
- Try different language settings
- Check if handwriting is legible

### Issue: Mixed results on same page
**Solution**:
- This is normal for pages with both printed and handwritten text
- System processes entire page with best available mode
- Review and correct in Cleanup page

---

## Summary

### ✅ For Scanned PDFs with Handwriting
→ **Use "Run OCR"** - Automatic handwriting detection included!

### ✅ For Handwritten Image Files  
→ **Use "Convert Handwritten Image to PDF"** - Specialized processing!

### ✅ Both Features
- Support multiple languages
- Use LSTM neural network for handwriting
- Provide high-quality text extraction
- Integrate seamlessly with the digitization workflow

---

**Version**: 1.1.1  
**Last Updated**: January 31, 2026  
**Feature Status**: ✅ Production Ready
