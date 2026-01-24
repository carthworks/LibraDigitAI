#!/usr/bin/env python3
"""
Text to PDF Converter Utility
Converts plain text files (with .pdf extension) to proper PDF documents
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER


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
        print(f"Error checking file: {e}")
        return False


def convert_text_to_pdf(text_filepath, output_filepath=None):
    """
    Convert a text file to a proper PDF document
    
    Args:
        text_filepath: Path to the text file
        output_filepath: Optional output path. If not provided, will overwrite the original
    """
    try:
        # Read the text content
        with open(text_filepath, 'r', encoding='utf-8') as f:
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
        
        # Determine output path
        if output_filepath is None:
            output_filepath = text_filepath
        
        # Create PDF
        doc = SimpleDocTemplate(
            output_filepath,
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
        
        print(f"✓ Successfully converted: {text_filepath}")
        print(f"  Output: {output_filepath}")
        return True
        
    except Exception as e:
        print(f"✗ Error converting {text_filepath}: {e}")
        return False


def convert_directory(directory_path):
    """
    Recursively convert all text files with .pdf extension in a directory
    
    Args:
        directory_path: Path to the directory to scan
    """
    converted_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"\n🔍 Scanning directory: {directory_path}\n")
    
    for root, dirs, files in os.walk(directory_path):
        for filename in files:
            if filename.endswith('.pdf'):
                filepath = os.path.join(root, filename)
                
                # Check if it's actually a text file
                if is_text_file(filepath):
                    print(f"📄 Found text file: {filename}")
                    if convert_text_to_pdf(filepath):
                        converted_count += 1
                    else:
                        error_count += 1
                else:
                    skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"📊 Conversion Summary:")
    print(f"   ✓ Converted: {converted_count}")
    print(f"   ⊘ Skipped (already PDF): {skipped_count}")
    print(f"   ✗ Errors: {error_count}")
    print(f"{'='*60}\n")


def main():
    """Main function to handle command-line usage"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Convert single file: python convert_text_to_pdf.py <filepath>")
        print("  Convert directory:   python convert_text_to_pdf.py <directory>")
        print("\nExample:")
        print("  python convert_text_to_pdf.py Archive/")
        sys.exit(1)
    
    path = sys.argv[1]
    
    if not os.path.exists(path):
        print(f"Error: Path does not exist: {path}")
        sys.exit(1)
    
    if os.path.isfile(path):
        # Convert single file
        if is_text_file(path):
            convert_text_to_pdf(path)
        else:
            print(f"File is already a valid PDF: {path}")
    elif os.path.isdir(path):
        # Convert directory
        convert_directory(path)
    else:
        print(f"Error: Invalid path: {path}")
        sys.exit(1)


if __name__ == '__main__':
    main()
