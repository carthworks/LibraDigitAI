"""
Advanced OCR Processor for LibraDigit AI
Handles:
- Page structure analysis (headers, footers, stamps, signatures)
- High-accuracy OCR with layout understanding
- Table and form extraction
- Handwritten text recognition
- Page orientation correction
"""

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
from typing import Dict, List, Tuple, Any
import json
import re


class AdvancedOCRProcessor:
    """Advanced OCR processing with layout analysis and structure detection"""
    
    def __init__(self):
        self.page_structure = {}
        self.detected_tables = []
        self.detected_forms = []
        self.orientation_corrected = False
        
    def detect_and_correct_orientation(self, image_path: str) -> Tuple[Image.Image, int]:
        """
        Detect page orientation and correct it
        Returns: (corrected_image, rotation_angle)
        """
        try:
            image = Image.open(image_path)
            
            # Convert to grayscale for better OSD detection
            if image.mode != 'L':
                gray_image = image.convert('L')
            else:
                gray_image = image
            
            # Use Tesseract's OSD (Orientation and Script Detection)
            osd = pytesseract.image_to_osd(gray_image)
            
            # Parse rotation angle
            rotation_match = re.search(r'Rotate: (\d+)', osd)
            rotation_angle = int(rotation_match.group(1)) if rotation_match else 0
            
            # Rotate image if needed
            if rotation_angle != 0:
                image = image.rotate(rotation_angle, expand=True)
                self.orientation_corrected = True
                print(f"✅ Corrected orientation: rotated {rotation_angle}°")
            
            return image, rotation_angle
            
        except Exception as e:
            print(f"⚠️ Orientation detection failed: {e}")
            # Return original image if detection fails
            return Image.open(image_path), 0
    
    def preprocess_image(self, image: Image.Image, enhance: bool = True) -> Image.Image:
        """
        Preprocess image for better OCR accuracy
        - Denoise
        - Enhance contrast
        - Sharpen
        - Binarization
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to OpenCV format
            img_array = np.array(image)
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # Adaptive thresholding for better text extraction
            binary = cv2.adaptiveThreshold(
                denoised, 255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Convert back to PIL
            processed_image = Image.fromarray(binary)
            
            if enhance:
                # Enhance contrast
                enhancer = ImageEnhance.Contrast(processed_image)
                processed_image = enhancer.enhance(1.5)
                
                # Sharpen
                processed_image = processed_image.filter(ImageFilter.SHARPEN)
            
            return processed_image
            
        except Exception as e:
            print(f"⚠️ Image preprocessing failed: {e}")
            return image
    
    def detect_page_structure(self, image: Image.Image) -> Dict[str, Any]:
        """
        Detect page structure elements:
        - Headers
        - Footers
        - Margins
        - Stamps/Watermarks
        - Signatures
        """
        try:
            width, height = image.size
            
            # Define regions (percentages of page)
            header_region = (0, 0, width, int(height * 0.15))  # Top 15%
            footer_region = (0, int(height * 0.85), width, height)  # Bottom 15%
            body_region = (0, int(height * 0.15), width, int(height * 0.85))  # Middle 70%
            
            # Extract regions
            header_img = image.crop(header_region)
            footer_img = image.crop(footer_region)
            body_img = image.crop(body_region)
            
            # OCR on each region
            header_text = pytesseract.image_to_string(header_img).strip()
            footer_text = pytesseract.image_to_string(footer_img).strip()
            
            # Detect stamps/watermarks (look for rotated text or special patterns)
            stamps = self._detect_stamps(image)
            
            # Detect signatures (look for handwritten regions)
            signatures = self._detect_signatures(image)
            
            structure = {
                'header': {
                    'text': header_text,
                    'region': header_region,
                    'present': bool(header_text)
                },
                'footer': {
                    'text': footer_text,
                    'region': footer_region,
                    'present': bool(footer_text)
                },
                'body_region': body_region,
                'stamps': stamps,
                'signatures': signatures,
                'page_size': {'width': width, 'height': height}
            }
            
            self.page_structure = structure
            return structure
            
        except Exception as e:
            print(f"⚠️ Page structure detection failed: {e}")
            return {}
    
    def _detect_stamps(self, image: Image.Image) -> List[Dict]:
        """Detect stamps and watermarks using contour detection"""
        try:
            # Convert to OpenCV format
            img_array = np.array(image.convert('RGB'))
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            stamps = []
            for contour in contours:
                area = cv2.contourArea(contour)
                # Look for circular or rectangular stamps (medium-sized contours)
                if 1000 < area < 50000:
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h if h > 0 else 0
                    
                    # Circular stamps have aspect ratio close to 1
                    if 0.7 < aspect_ratio < 1.3:
                        stamps.append({
                            'type': 'circular_stamp',
                            'bbox': (x, y, w, h),
                            'area': area
                        })
            
            return stamps
            
        except Exception as e:
            print(f"⚠️ Stamp detection failed: {e}")
            return []
    
    def _detect_signatures(self, image: Image.Image) -> List[Dict]:
        """Detect signature regions (handwritten areas)"""
        try:
            # Convert to OpenCV format
            img_array = np.array(image.convert('RGB'))
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Look for regions with handwriting characteristics
            # Signatures typically have:
            # - Lower density than printed text
            # - More curved lines
            # - Usually in bottom third of page
            
            height = gray.shape[0]
            signature_region = gray[int(height * 0.6):, :]  # Bottom 40%
            
            # Edge detection
            edges = cv2.Canny(signature_region, 30, 100)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            signatures = []
            for contour in contours:
                area = cv2.contourArea(contour)
                # Signatures are typically medium-sized
                if 500 < area < 20000:
                    x, y, w, h = cv2.boundingRect(contour)
                    # Adjust y coordinate to full image
                    y_adjusted = y + int(height * 0.6)
                    
                    signatures.append({
                        'type': 'signature',
                        'bbox': (x, y_adjusted, w, h),
                        'area': area
                    })
            
            return signatures
            
        except Exception as e:
            print(f"⚠️ Signature detection failed: {e}")
            return []
    
    def detect_tables(self, image: Image.Image) -> List[Dict]:
        """
        Detect tables in the document using line detection
        Returns list of table regions with their data
        """
        try:
            # Convert to OpenCV format
            img_array = np.array(image.convert('RGB'))
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Threshold
            _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)
            
            # Detect horizontal lines
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
            
            # Detect vertical lines
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)
            
            # Combine lines
            table_mask = cv2.add(horizontal_lines, vertical_lines)
            
            # Find contours of tables
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            tables = []
            for idx, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                # Filter out small noise
                if area > 5000:
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Extract table region
                    table_img = image.crop((x, y, x+w, y+h))
                    
                    # OCR the table with specific config for tables
                    table_text = pytesseract.image_to_string(
                        table_img,
                        config='--psm 6'  # Assume uniform block of text
                    )
                    
                    # Try to parse as TSV (Tab-Separated Values)
                    table_data = pytesseract.image_to_data(
                        table_img,
                        output_type=pytesseract.Output.DICT
                    )
                    
                    tables.append({
                        'table_id': idx,
                        'bbox': (x, y, w, h),
                        'area': area,
                        'text': table_text,
                        'structured_data': self._parse_table_data(table_data)
                    })
            
            self.detected_tables = tables
            return tables
            
        except Exception as e:
            print(f"⚠️ Table detection failed: {e}")
            return []
    
    def _parse_table_data(self, ocr_data: Dict) -> List[List[str]]:
        """Parse OCR data into table structure"""
        try:
            # Group text by line number
            lines = {}
            for i, text in enumerate(ocr_data['text']):
                if text.strip():
                    line_num = ocr_data['line_num'][i]
                    if line_num not in lines:
                        lines[line_num] = []
                    lines[line_num].append(text)
            
            # Convert to 2D array
            table_array = [lines[line] for line in sorted(lines.keys())]
            return table_array
            
        except Exception as e:
            print(f"⚠️ Table parsing failed: {e}")
            return []
    
    def detect_forms(self, image: Image.Image) -> List[Dict]:
        """
        Detect form fields (checkboxes, text fields, etc.)
        """
        try:
            # Convert to OpenCV format
            img_array = np.array(image.convert('RGB'))
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Detect checkboxes (small squares)
            _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours
            contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            checkboxes = []
            text_fields = []
            
            for contour in contours:
                area = cv2.contourArea(contour)
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h if h > 0 else 0
                
                # Checkbox detection (small squares)
                if 100 < area < 2000 and 0.8 < aspect_ratio < 1.2:
                    # Check if it's filled
                    roi = binary[y:y+h, x:x+w]
                    fill_ratio = np.sum(roi == 255) / (w * h) if (w * h) > 0 else 0
                    
                    checkboxes.append({
                        'type': 'checkbox',
                        'bbox': (x, y, w, h),
                        'checked': fill_ratio > 0.3
                    })
                
                # Text field detection (long rectangles)
                elif area > 1000 and aspect_ratio > 3:
                    text_fields.append({
                        'type': 'text_field',
                        'bbox': (x, y, w, h)
                    })
            
            forms = {
                'checkboxes': checkboxes,
                'text_fields': text_fields
            }
            
            self.detected_forms = forms
            return forms
            
        except Exception as e:
            print(f"⚠️ Form detection failed: {e}")
            return {}
    
    def extract_handwritten_text(self, image: Image.Image, language: str = 'eng') -> str:
        """
        Extract handwritten text using specialized Tesseract configuration
        """
        try:
            # Preprocess for handwriting
            processed = self.preprocess_image(image, enhance=True)
            
            # Use PSM 6 or 7 for handwriting
            # --oem 1 uses LSTM neural network (better for handwriting)
            custom_config = r'--oem 1 --psm 6'
            
            handwritten_text = pytesseract.image_to_string(
                processed,
                lang=language,
                config=custom_config
            )
            
            return handwritten_text.strip()
            
        except Exception as e:
            print(f"⚠️ Handwritten text extraction failed: {e}")
            return ""
    
    def _convert_to_serializable(self, obj):
        """Convert numpy and Python types to JSON-serializable types"""
        if isinstance(obj, dict):
            return {key: self._convert_to_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_serializable(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._convert_to_serializable(item) for item in obj)
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        else:
            return obj
    
    def process_document_with_layout(self, image_path: str, language: str = 'eng') -> Dict[str, Any]:
        """
        Complete document processing with layout understanding
        Returns comprehensive document structure
        """
        try:
            print("🔍 Starting advanced OCR processing...")
            
            # Step 1: Detect and correct orientation
            print("📐 Detecting page orientation...")
            image, rotation = self.detect_and_correct_orientation(image_path)
            
            # Step 2: Preprocess image
            print("🖼️ Preprocessing image...")
            processed_image = self.preprocess_image(image)
            
            # Step 3: Detect page structure
            print("📄 Analyzing page structure...")
            structure = self.detect_page_structure(image)
            
            # Step 4: Detect tables
            print("📊 Detecting tables...")
            tables = self.detect_tables(image)
            
            # Step 5: Detect forms
            print("📝 Detecting form fields...")
            forms = self.detect_forms(image)
            
            # Step 6: Extract main text with layout
            print("📖 Extracting text with layout...")
            # Use PSM 3 for automatic page segmentation
            main_text = pytesseract.image_to_string(
                processed_image,
                lang=language,
                config='--psm 3'
            )
            
            # Step 7: Get detailed layout information
            layout_data = pytesseract.image_to_data(
                processed_image,
                lang=language,
                output_type=pytesseract.Output.DICT
            )
            
            # Step 8: Extract handwritten regions if detected
            handwritten_text = ""
            if structure.get('signatures'):
                print("✍️ Extracting handwritten text...")
                handwritten_text = self.extract_handwritten_text(image, language)
            
            result = {
                'success': True,
                'orientation': {
                    'corrected': bool(self.orientation_corrected),
                    'rotation_angle': int(rotation)
                },
                'page_structure': self._convert_to_serializable(structure),
                'tables': self._convert_to_serializable(tables),
                'forms': self._convert_to_serializable(forms),
                'main_text': str(main_text),
                'handwritten_text': str(handwritten_text),
                'layout_data': self._convert_to_serializable(layout_data),
                'statistics': {
                    'total_words': int(len(main_text.split())),
                    'tables_found': int(len(tables)),
                    'checkboxes_found': int(len(forms.get('checkboxes', []))),
                    'text_fields_found': int(len(forms.get('text_fields', []))),
                    'stamps_found': int(len(structure.get('stamps', []))),
                    'signatures_found': int(len(structure.get('signatures', [])))
                }
            }
            
            print("✅ Advanced OCR processing completed!")
            return result
            
        except Exception as e:
            print(f"❌ Advanced OCR processing failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'main_text': ''
            }
    
    def generate_structured_output(self, result: Dict[str, Any]) -> str:
        """
        Generate a human-readable structured output from OCR results
        """
        output = []
        
        # Header
        output.append("=" * 80)
        output.append("DOCUMENT ANALYSIS REPORT")
        output.append("=" * 80)
        output.append("")
        
        # Orientation
        if result.get('orientation', {}).get('corrected'):
            output.append(f"📐 Page Orientation: Corrected ({result['orientation']['rotation_angle']}° rotation)")
        else:
            output.append("📐 Page Orientation: Correct")
        output.append("")
        
        # Page Structure
        structure = result.get('page_structure', {})
        if structure:
            output.append("📄 PAGE STRUCTURE")
            output.append("-" * 80)
            
            if structure.get('header', {}).get('present'):
                output.append(f"Header: {structure['header']['text'][:100]}...")
            
            if structure.get('footer', {}).get('present'):
                output.append(f"Footer: {structure['footer']['text'][:100]}...")
            
            if structure.get('stamps'):
                output.append(f"Stamps/Watermarks: {len(structure['stamps'])} detected")
            
            if structure.get('signatures'):
                output.append(f"Signatures: {len(structure['signatures'])} detected")
            
            output.append("")
        
        # Tables
        tables = result.get('tables', [])
        if tables:
            output.append("📊 TABLES")
            output.append("-" * 80)
            for idx, table in enumerate(tables):
                output.append(f"\nTable {idx + 1}:")
                output.append(table['text'][:200] + "..." if len(table['text']) > 200 else table['text'])
            output.append("")
        
        # Forms
        forms = result.get('forms', {})
        if forms.get('checkboxes') or forms.get('text_fields'):
            output.append("📝 FORM FIELDS")
            output.append("-" * 80)
            
            checkboxes = forms.get('checkboxes', [])
            if checkboxes:
                checked = sum(1 for cb in checkboxes if cb.get('checked'))
                output.append(f"Checkboxes: {len(checkboxes)} total ({checked} checked)")
            
            text_fields = forms.get('text_fields', [])
            if text_fields:
                output.append(f"Text Fields: {len(text_fields)} detected")
            
            output.append("")
        
        # Main Text
        output.append("📖 MAIN CONTENT")
        output.append("-" * 80)
        output.append(result.get('main_text', ''))
        output.append("")
        
        # Handwritten Text
        if result.get('handwritten_text'):
            output.append("✍️ HANDWRITTEN TEXT")
            output.append("-" * 80)
            output.append(result['handwritten_text'])
            output.append("")
        
        # Statistics
        stats = result.get('statistics', {})
        if stats:
            output.append("📈 STATISTICS")
            output.append("-" * 80)
            output.append(f"Total Words: {stats.get('total_words', 0)}")
            output.append(f"Tables: {stats.get('tables_found', 0)}")
            output.append(f"Checkboxes: {stats.get('checkboxes_found', 0)}")
            output.append(f"Text Fields: {stats.get('text_fields_found', 0)}")
            output.append(f"Stamps: {stats.get('stamps_found', 0)}")
            output.append(f"Signatures: {stats.get('signatures_found', 0)}")
        
        output.append("")
        output.append("=" * 80)
        
        return "\n".join(output)
