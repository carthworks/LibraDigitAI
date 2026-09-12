# Advanced OCR Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LibraDigit AI - Advanced OCR                        │
│                         Document Analysis System                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        UploadOCR.jsx                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  User Interface                                                 │  │  │
│  │  │  • File upload                                                  │  │  │
│  │  │  • Language selection                                           │  │  │
│  │  │  • Advanced OCR toggle ⚡                                       │  │  │
│  │  │  • Feature list display                                         │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  runAdvancedOCR() / runOCR()                                    │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AdvancedOCRResults.jsx                             │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Results Display                                                │  │  │
│  │  │  • Orientation status                                           │  │  │
│  │  │  • Tables count                                                 │  │  │
│  │  │  • Forms detected                                               │  │  │
│  │  │  • Stamps & signatures                                          │  │  │
│  │  │  • Statistics summary                                           │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   │ HTTP POST /api/ocr/advanced/<id>
                                   │ { language: 'eng', advanced: true }
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Flask + Python)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         server.py                                     │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  API Endpoint: /api/ocr/advanced/<project_id>                  │  │  │
│  │  │  • Validate request                                             │  │  │
│  │  │  • Get project file path                                        │  │  │
│  │  │  • Initialize AdvancedOCRProcessor                              │  │  │
│  │  │  • Process document                                             │  │  │
│  │  │  • Save results to database                                     │  │  │
│  │  │  • Return JSON response                                         │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              advanced_ocr_processor.py                                │  │
│  │                                                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 1: Orientation Detection & Correction                    │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • pytesseract.image_to_osd()                            │  │  │  │
│  │  │  │  • Detect rotation angle (0°, 90°, 180°, 270°)           │  │  │  │
│  │  │  │  • Rotate image if needed                                │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 2: Image Preprocessing                                   │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • Convert to grayscale                                  │  │  │  │
│  │  │  │  • cv2.fastNlMeansDenoising() - Remove noise             │  │  │  │
│  │  │  │  • cv2.adaptiveThreshold() - Binarization                │  │  │  │
│  │  │  │  • ImageEnhance.Contrast() - Enhance contrast            │  │  │  │
│  │  │  │  • ImageFilter.SHARPEN - Sharpen edges                   │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 3: Page Structure Analysis                               │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • Extract header region (top 15%)                       │  │  │  │
│  │  │  │  • Extract footer region (bottom 15%)                    │  │  │  │
│  │  │  │  • Extract body region (middle 70%)                      │  │  │  │
│  │  │  │  • Detect stamps (circular contours)                     │  │  │  │
│  │  │  │  • Detect signatures (handwritten regions)               │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 4: Table Detection                                       │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • cv2.morphologyEx() - Detect horizontal lines          │  │  │  │
│  │  │  │  • cv2.morphologyEx() - Detect vertical lines            │  │  │  │
│  │  │  │  • Combine lines to find table mask                      │  │  │  │
│  │  │  │  • cv2.findContours() - Find table boundaries            │  │  │  │
│  │  │  │  • Extract table regions                                 │  │  │  │
│  │  │  │  • OCR each table                                        │  │  │  │
│  │  │  │  • Parse into rows/columns                               │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 5: Form Field Detection                                  │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • cv2.findContours() - Find all contours                │  │  │  │
│  │  │  │  • Filter by size and aspect ratio                       │  │  │  │
│  │  │  │  • Identify checkboxes (small squares)                   │  │  │  │
│  │  │  │  • Check fill status (pixel density)                     │  │  │  │
│  │  │  │  • Identify text fields (long rectangles)                │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 6: Main Text Extraction                                  │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • pytesseract.image_to_string() with PSM 3              │  │  │  │
│  │  │  │  • Automatic page segmentation                           │  │  │  │
│  │  │  │  • Layout-aware text extraction                          │  │  │  │
│  │  │  │  • pytesseract.image_to_data() for layout info           │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 7: Handwritten Text Extraction                           │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • Use LSTM neural network (OEM 1)                       │  │  │  │
│  │  │  │  • Specialized PSM for handwriting                       │  │  │  │
│  │  │  │  • Enhanced preprocessing                                │  │  │  │
│  │  │  │  • Extract from signature regions                        │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ↓                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Step 8: Results Compilation                                   │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  • Compile all analysis results                          │  │  │  │
│  │  │  │  • Generate statistics                                   │  │  │  │
│  │  │  │  • Create structured output                              │  │  │  │
│  │  │  │  • Format for UI display                                 │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   │ Return JSON Response
                                   │
                                   ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE (SQLite)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ocr_text table                                                       │  │
│  │  • original_text: Structured OCR output with analysis                │  │
│  │  • cleaned_text: User-edited text                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  projects table                                                       │  │
│  │  • status: Updated to 'cleanup'                                       │  │
│  │  • updated_at: Timestamp                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DEPENDENCIES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Tesseract OCR   │  │     OpenCV       │  │      NumPy       │          │
│  │                  │  │                  │  │                  │          │
│  │  • Text          │  │  • Image         │  │  • Array         │          │
│  │    extraction    │  │    processing    │  │    operations    │          │
│  │  • OSD           │  │  • Contour       │  │  • Numerical     │          │
│  │  • Layout        │  │    detection     │  │    computing     │          │
│  │    analysis      │  │  • Morphology    │  │                  │          │
│  │  • LSTM OCR      │  │  • Thresholding  │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW SUMMARY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User uploads image → Frontend                                           │
│  2. User enables Advanced OCR toggle → Frontend                             │
│  3. Frontend sends POST request → Backend API                               │
│  4. Backend loads image file → AdvancedOCRProcessor                         │
│  5. Processor performs 8-step analysis → Results                            │
│  6. Results saved to database → SQLite                                      │
│  7. JSON response sent → Frontend                                           │
│  8. Frontend displays comprehensive results → User                          │
│  9. User proceeds to cleanup/editing → Next stage                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEY ALGORITHMS USED                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Non-Local Means Denoising (cv2.fastNlMeansDenoising)                     │
│  • Adaptive Thresholding (cv2.adaptiveThreshold)                            │
│  • Morphological Operations (cv2.morphologyEx)                              │
│  • Canny Edge Detection (cv2.Canny)                                         │
│  • Contour Detection (cv2.findContours)                                     │
│  • Tesseract OSD (Orientation and Script Detection)                         │
│  • Tesseract LSTM Neural Network (OEM 1)                                    │
│  • Page Segmentation Modes (PSM 3, PSM 6)                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Upload image
       ↓
┌─────────────────────┐
│  UploadOCR.jsx      │
│  • File selection   │
│  • Toggle Advanced  │
│  • Select language  │
└──────┬──────────────┘
       │
       │ 2. Click "Run Advanced OCR"
       ↓
┌─────────────────────┐
│ ProjectContext.jsx  │
│ runAdvancedOCR()    │
└──────┬──────────────┘
       │
       │ 3. POST /api/ocr/advanced/<id>
       ↓
┌─────────────────────┐
│   server.py         │
│   API Endpoint      │
└──────┬──────────────┘
       │
       │ 4. Initialize processor
       ↓
┌──────────────────────────────┐
│ AdvancedOCRProcessor         │
│ process_document_with_layout │
└──────┬───────────────────────┘
       │
       │ 5. Return results
       ↓
┌─────────────────────┐
│   server.py         │
│   Save to DB        │
└──────┬──────────────┘
       │
       │ 6. JSON response
       ↓
┌─────────────────────┐
│ ProjectContext.jsx  │
│ Update state        │
└──────┬──────────────┘
       │
       │ 7. Display results
       ↓
┌─────────────────────┐
│AdvancedOCRResults   │
│ .jsx                │
└──────┬──────────────┘
       │
       │ 8. View analysis
       ↓
┌─────────────┐
│   User      │
└─────────────┘
```
