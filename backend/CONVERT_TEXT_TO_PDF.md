# Text to PDF Converter Utility

This utility converts plain text files (that may have a `.pdf` extension) into proper PDF documents.

## Problem

Sometimes archive files are created as plain text files with a `.pdf` extension. These files cannot be opened by PDF readers and cause "Failed to load PDF document" errors.

## Solution

This script:
1. Detects text files masquerading as PDFs
2. Converts them to proper PDF format
3. Preserves metadata (Author, Year, Subject, Title)
4. Creates professionally formatted PDF documents

## Installation

Install the required dependency:

```bash
pip install reportlab
```

Or install all backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

## Usage

### Convert a Single File

```bash
python convert_text_to_pdf.py "path/to/file.pdf"
```

### Convert All Files in a Directory

```bash
python convert_text_to_pdf.py "Archive/"
```

This will recursively scan the directory and convert all text files with `.pdf` extensions.

### Example

```bash
# Convert the specific file mentioned in the issue
python convert_text_to_pdf.py "Archive/  WEBSITE PACKAGE/2025/Latha_2025_Veterinary Clinic.pdf"

# Or convert all files in the Archive directory
python convert_text_to_pdf.py "Archive/"
```

## What It Does

1. **Detects File Type**: Checks if a `.pdf` file is actually a text file
2. **Extracts Metadata**: Parses structured metadata from the text content
3. **Creates PDF**: Generates a properly formatted PDF with:
   - Title heading
   - Metadata sections (Author, Year, Subject)
   - Remaining content
   - Professional styling

## Output

The script will:
- ✓ Show which files were converted
- ⊘ Skip files that are already valid PDFs
- ✗ Report any errors encountered
- 📊 Display a summary at the end

## Integration with LibraDigit AI

The backend server (`server.py`) has been updated to automatically detect and handle text files:

- When uploading a file, the system checks if it's a text file with a `.pdf` extension
- If detected, it extracts the text content directly
- Adds a note to inform the user about the file type
- Allows the workflow to continue normally

## Notes

- The original file is **overwritten** with the PDF version
- Make backups if you want to preserve the original text files
- The script is safe to run multiple times (it skips already-converted PDFs)
