"""
Handwritten Text to PDF Converter for LibraDigit AI
Converts handwritten notes to clean, formatted PDFs
"""

import re
from typing import Any, Dict

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


class HandwrittenToPDFConverter:
    """Convert handwritten text images to formatted PDFs"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for better formatting"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Heading style
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#34495E'),
            spaceAfter=10,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        # Body text style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            leading=16,
            textColor=colors.HexColor('#2C3E50'),
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))

        # Code/Technical style
        self.styles.add(ParagraphStyle(
            name='TechnicalText',
            parent=self.styles['Code'],
            fontSize=10,
            textColor=colors.HexColor('#2C3E50'),
            fontName='Courier',
            leftIndent=20,
            spaceAfter=6
        ))

    def preprocess_handwritten_image(self, image_path: str) -> Image.Image:
        """
        Specialized preprocessing for handwritten text
        - Enhance contrast
        - Remove noise
        - Sharpen text
        - Binarization
        """
        try:
            # Load image
            image = Image.open(image_path)

            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Convert to OpenCV format
            img_array = np.array(image)
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Convert to grayscale
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

            # Denoise - stronger for handwriting
            denoised = cv2.fastNlMeansDenoising(gray, None, h=15, templateWindowSize=7, searchWindowSize=21)

            # Increase contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)

            # Adaptive thresholding - better for handwriting
            binary = cv2.adaptiveThreshold(
                enhanced, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=15,
                C=10
            )

            # Morphological operations to clean up
            kernel = np.ones((2,2), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

            # Convert back to PIL
            processed_image = Image.fromarray(cleaned)

            # Additional PIL enhancements
            enhancer = ImageEnhance.Contrast(processed_image)
            processed_image = enhancer.enhance(1.5)

            # Sharpen
            processed_image = processed_image.filter(ImageFilter.SHARPEN)

            return processed_image

        except Exception as e:
            print(f"⚠️ Image preprocessing failed: {e}")
            return Image.open(image_path)

    def extract_handwritten_text(self, image_path: str, language: str = 'eng') -> Dict[str, Any]:
        """
        Extract text from handwritten image using specialized OCR
        """
        try:
            print("🔍 Preprocessing handwritten image...")
            processed_image = self.preprocess_handwritten_image(image_path)

            print("📖 Extracting handwritten text...")

            # Use LSTM neural network (OEM 1) which is better for handwriting
            # PSM 4: Assume a single column of text of variable sizes
            custom_config = r'--oem 1 --psm 4'

            # Extract text
            text = pytesseract.image_to_string(
                processed_image,
                lang=language,
                config=custom_config
            )

            # Get detailed data for structure
            data = pytesseract.image_to_data(
                processed_image,
                lang=language,
                output_type=pytesseract.Output.DICT,
                config=custom_config
            )

            # Analyze structure
            structure = self._analyze_text_structure(text, data)

            result = {
                'success': True,
                'raw_text': text,
                'structured_text': structure,
                'word_count': len(text.split()),
                'line_count': len([line for line in text.split('\n') if line.strip()])
            }

            print(f"✅ Extracted {result['word_count']} words from handwritten text")
            return result

        except Exception as e:
            print(f"❌ Handwritten text extraction failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'raw_text': ''
            }

    def _analyze_text_structure(self, text: str, ocr_data: Dict) -> Dict[str, Any]:
        """
        Analyze text structure to identify:
        - Headings (larger/bolder text)
        - Bullet points
        - Diagrams/drawings (represented as text)
        - Lists
        """
        lines = text.split('\n')
        structured = {
            'title': '',
            'headings': [],
            'paragraphs': [],
            'lists': [],
            'diagrams': []
        }

        # Simple heuristics for structure detection
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect title (first significant line)
            if not structured['title'] and len(line) > 3:
                structured['title'] = line

            # Detect headings (short lines, possibly with special chars)
            elif len(line) < 50 and any(c.isupper() for c in line):
                structured['headings'].append(line)

            # Detect lists (lines starting with -, *, •, numbers)
            elif re.match(r'^[\-\*•\d]+[\.\):]?\s', line):
                structured['lists'].append(line)

            # Detect diagrams (lines with special chars like arrows, boxes)
            elif any(char in line for char in ['→', '←', '↑', '↓', '─', '│', '┌', '┐', '└', '┘', '|', '-', '~']):
                structured['diagrams'].append(line)

            # Regular paragraphs
            else:
                structured['paragraphs'].append(line)

        return structured

    def generate_formatted_pdf(self, extracted_data: Dict[str, Any], output_path: str,
                               title: str = "Handwritten Notes",
                               author: str = None,
                               subject: str = None,
                               creator: str = None) -> bool:
        """
        Generate a clean, formatted PDF from extracted handwritten text
        """
        try:
            print(f"📄 Generating formatted PDF: {output_path}")

            # Create PDF document
            doc = SimpleDocTemplate(
                output_path,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18,
                title=title,
                author=author or "",
                subject=subject or "",
                creator=creator or "LibraDigit AI"
            )

            # Container for PDF elements
            story = []

            # Add title
            story.append(Paragraph(self._clean_text(title), self.styles['CustomTitle']))
            story.append(Spacer(1, 0.2*inch))

            # Get structured text
            structure = extracted_data.get('structured_text', {})

            # Add document title if detected
            if structure.get('title'):
                story.append(Paragraph(structure['title'], self.styles['CustomHeading']))
                story.append(Spacer(1, 0.15*inch))

            # Add headings
            for heading in structure.get('headings', []):
                story.append(Paragraph(heading, self.styles['CustomHeading']))
                story.append(Spacer(1, 0.1*inch))

            # Add paragraphs
            for para in structure.get('paragraphs', []):
                # Clean and format paragraph
                cleaned_para = self._clean_text(para)
                if cleaned_para:
                    story.append(Paragraph(cleaned_para, self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))

            # Add lists
            if structure.get('lists'):
                story.append(Paragraph("<b>Key Points:</b>", self.styles['CustomHeading']))
                for item in structure['lists']:
                    cleaned_item = self._clean_text(item)
                    story.append(Paragraph(f"• {cleaned_item}", self.styles['CustomBody']))
                    story.append(Spacer(1, 0.05*inch))
                story.append(Spacer(1, 0.1*inch))

            # Add diagrams/technical content
            if structure.get('diagrams'):
                story.append(Paragraph("<b>Diagrams/Technical Content:</b>", self.styles['CustomHeading']))
                for diagram in structure['diagrams']:
                    story.append(Paragraph(diagram, self.styles['TechnicalText']))
                    story.append(Spacer(1, 0.05*inch))

            # Add separator
            story.append(Spacer(1, 0.3*inch))

            # Add full raw text section
            story.append(Paragraph("<b>Complete Extracted Text:</b>", self.styles['CustomHeading']))
            story.append(Spacer(1, 0.1*inch))

            raw_text = extracted_data.get('raw_text', '')
            for line in raw_text.split('\n'):
                cleaned_line = self._clean_text(line)
                if cleaned_line:
                    story.append(Paragraph(cleaned_line, self.styles['CustomBody']))

            # Add footer with metadata
            story.append(Spacer(1, 0.3*inch))
            story.append(Paragraph(
                f"<i>Generated by LibraDigit AI | Words: {extracted_data.get('word_count', 0)} | "
                f"Lines: {extracted_data.get('line_count', 0)}</i>",
                self.styles['Normal']
            ))

            # Build PDF
            doc.build(story)

            print(f"✅ PDF generated successfully: {output_path}")
            return True

        except Exception as e:
            print(f"❌ PDF generation failed: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _clean_text(self, text: str) -> str:
        """Clean and format text for PDF"""
        # Remove excessive whitespace
        text = ' '.join(text.split())

        # Escape special characters for ReportLab
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')

        return text

    def convert_handwritten_to_pdf(self, image_path: str, output_path: str,
                                   title: str = "Handwritten Notes",
                                   language: str = 'eng',
                                   metadata: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Complete workflow: Extract handwritten text and generate formatted PDF
        """
        try:
            # Extract text
            extracted_data = self.extract_handwritten_text(image_path, language)

            if not extracted_data.get('success'):
                return {
                    'success': False,
                    'error': extracted_data.get('error', 'Text extraction failed')
                }

            # Generate PDF
            meta = metadata or {}
            pdf_success = self.generate_formatted_pdf(
                extracted_data,
                output_path,
                title,
                author=meta.get('author'),
                subject=meta.get('subject'),
                creator=meta.get('creator')
            )

            if not pdf_success:
                return {
                    'success': False,
                    'error': 'PDF generation failed'
                }

            return {
                'success': True,
                'message': 'Handwritten text converted to PDF successfully',
                'output_file': output_path,
                'word_count': extracted_data.get('word_count', 0),
                'line_count': extracted_data.get('line_count', 0),
                'extracted_text': extracted_data.get('raw_text', '')
            }

        except Exception as e:
            print(f"❌ Conversion failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
