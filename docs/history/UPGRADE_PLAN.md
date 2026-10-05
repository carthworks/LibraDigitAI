# LibraDigit AI - Upgrade Implementation Plan

## Upgrade #1: AI-Powered Metadata Extraction
## Upgrade #2: Batch Processing & Bulk Operations

**Implementation Date**: January 25, 2026  
**Estimated Completion**: 2-3 hours  
**Impact**: HIGH - Reduces processing time by 70-80%

---

## 🎯 Feature Overview

### **1. AI-Powered Metadata Extraction**

**Capabilities**:
- ✅ Auto-extract title from document (first heading, bold text, or filename)
- ✅ Detect author names using NLP patterns
- ✅ Extract publication year from text (4-digit year detection)
- ✅ Auto-suggest keywords based on text frequency analysis
- ✅ Smart subject categorization using keyword matching
- ✅ Confidence scoring for each extracted field
- ✅ Manual override option (user can accept/reject suggestions)

**Technical Approach**:
- Use Python NLP libraries (spaCy, NLTK, or regex-based extraction)
- Create intelligent extraction algorithms
- No external API calls (offline-first)
- Fast processing (< 2 seconds per document)

---

### **2. Batch Processing & Bulk Operations**

**Capabilities**:
- ✅ Upload multiple files at once (drag & drop folder support)
- ✅ Batch OCR processing with queue management
- ✅ Real-time progress tracking (per-file and overall)
- ✅ Bulk metadata editing (apply same metadata to multiple files)
- ✅ Pause/resume batch operations
- ✅ Error handling (skip failed files, continue processing)
- ✅ Batch export to archive
- ✅ Processing statistics (success/failed counts, time estimates)

**Technical Approach**:
- Queue-based processing system
- Background task management
- Progress tracking with WebSocket or polling
- Parallel processing for OCR (configurable workers)

---

## 📋 Implementation Steps

### **Phase 1: Backend Enhancements**

#### 1.1 Install Required Dependencies
```bash
pip install spacy nltk python-dateutil
python -m spacy download en_core_web_sm
```

#### 1.2 Create Metadata Extraction Module
- `backend/metadata_extractor.py` - AI extraction logic
- Functions:
  - `extract_title(text)` - Find document title
  - `extract_authors(text)` - Detect author names
  - `extract_year(text)` - Find publication year
  - `extract_keywords(text)` - Generate keyword suggestions
  - `suggest_subject(text, keywords)` - Categorize subject
  - `extract_all_metadata(text)` - Combined extraction

#### 1.3 Create Batch Processing Module
- `backend/batch_processor.py` - Queue management
- Functions:
  - `create_batch_job(files)` - Initialize batch
  - `process_batch_ocr(batch_id)` - Run OCR on all files
  - `get_batch_status(batch_id)` - Progress tracking
  - `cancel_batch(batch_id)` - Stop processing

#### 1.4 Update Database Schema
```sql
-- Batch jobs table
CREATE TABLE batch_jobs (
    id INTEGER PRIMARY KEY,
    name TEXT,
    total_files INTEGER,
    processed_files INTEGER,
    status TEXT, -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Batch items table
CREATE TABLE batch_items (
    id INTEGER PRIMARY KEY,
    batch_id INTEGER,
    project_id INTEGER,
    status TEXT, -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    FOREIGN KEY (batch_id) REFERENCES batch_jobs(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Metadata suggestions table
CREATE TABLE metadata_suggestions (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    suggested_title TEXT,
    suggested_author TEXT,
    suggested_year TEXT,
    suggested_subject TEXT,
    suggested_keywords TEXT,
    confidence_scores TEXT, -- JSON with scores
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### 1.5 Create New API Endpoints
- `POST /api/metadata/extract/<project_id>` - Extract metadata suggestions
- `POST /api/batch/create` - Create batch job
- `POST /api/batch/<batch_id>/start` - Start batch processing
- `GET /api/batch/<batch_id>/status` - Get progress
- `POST /api/batch/<batch_id>/cancel` - Cancel batch
- `POST /api/batch/bulk-metadata` - Apply metadata to multiple projects

---

### **Phase 2: Frontend Enhancements**

#### 2.1 Update Upload Page (Batch Upload)
- Multi-file drag & drop zone
- File list with preview
- Batch upload button
- Upload progress for each file

#### 2.2 Create Batch Processing Dashboard
- New page: `src/pages/BatchProcessing.jsx`
- Features:
  - Active batch jobs list
  - Progress bars (overall + per-file)
  - Pause/Resume/Cancel controls
  - Success/Failed file counts
  - Estimated time remaining

#### 2.3 Enhance Metadata Page (AI Suggestions)
- Auto-fill suggestions panel
- Confidence indicators (green/yellow/red)
- Accept/Reject buttons for each field
- "Accept All Suggestions" button
- Manual edit always available

#### 2.4 Create Bulk Metadata Editor
- New component: `src/components/BulkMetadataEditor.jsx`
- Select multiple projects
- Apply same metadata to all
- Preview before applying

#### 2.5 Update Dashboard
- Show batch processing status
- Quick stats (total processed today, success rate)
- Recent batches section

---

### **Phase 3: UI/UX Enhancements**

#### 3.1 New Components
- `BatchUploadZone.jsx` - Multi-file upload
- `BatchProgressTracker.jsx` - Progress visualization
- `MetadataSuggestions.jsx` - AI suggestions panel
- `BulkMetadataEditor.jsx` - Bulk editing interface
- `ProcessingQueue.jsx` - Queue visualization

#### 3.2 Enhanced Styling
- Batch processing animations
- Progress indicators
- Confidence score visualizations
- Success/error notifications

---

### **Phase 4: Testing & Optimization**

#### 4.1 Test Cases
- Upload 10 files simultaneously
- Extract metadata from various document types
- Handle OCR failures gracefully
- Test pause/resume functionality
- Verify bulk metadata application

#### 4.2 Performance Optimization
- Parallel OCR processing (2-4 workers)
- Database query optimization
- Memory management for large batches
- Progress update throttling

---

## 🎨 UI Mockup Changes

### **New Upload Page Layout**
```
┌─────────────────────────────────────────────┐
│  📁 Batch Upload & OCR Processing           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Drag & Drop Multiple Files Here     │ │
│  │  or Click to Browse                   │ │
│  │                                       │ │
│  │  📄 document1.pdf                     │ │
│  │  📄 document2.pdf                     │ │
│  │  📄 document3.pdf                     │ │
│  │  + 7 more files...                    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [Upload All (10 files)] [Clear]            │
│                                             │
│  Batch Processing Queue:                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60%      │
│  Processing: document3.pdf (6/10)           │
│  Estimated time: 2 minutes remaining        │
│                                             │
└─────────────────────────────────────────────┘
```

### **Enhanced Metadata Page**
```
┌─────────────────────────────────────────────┐
│  📝 Metadata Entry - AI Assisted            │
├─────────────────────────────────────────────┤
│                                             │
│  🤖 AI Suggestions (90% confidence)         │
│  ┌───────────────────────────────────────┐ │
│  │ Title: "Digital Libraries in 2025"    │ │
│  │ ✓ Accept  ✗ Reject                    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Author: "Dr. Sarah Johnson"           │ │
│  │ ✓ Accept  ✗ Reject                    │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [Accept All Suggestions]                   │
│                                             │
│  Manual Entry:                              │
│  Title: [                               ]   │
│  Author: [                              ]   │
│  Year: [2025]                               │
│  Subject: [Technology ▼]                    │
│  Keywords: [digital, library, archive]      │
│                                             │
│  [Save Metadata] [Next →]                   │
└─────────────────────────────────────────────┘
```

---

## 📊 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to process 10 documents | 30 min | 8 min | **73% faster** |
| Metadata entry time per doc | 2 min | 20 sec | **83% faster** |
| User clicks per document | 15-20 | 3-5 | **75% reduction** |
| Batch processing capability | 1 at a time | 50+ files | **50x increase** |

---

## 🚀 Deployment Checklist

- [ ] Install Python dependencies
- [ ] Run database migrations
- [ ] Test metadata extraction accuracy
- [ ] Test batch processing with 10+ files
- [ ] Verify error handling
- [ ] Update user documentation
- [ ] Create demo video/tutorial

---

## 📚 User Documentation Updates

### New Features to Document:
1. How to upload multiple files
2. Understanding AI metadata suggestions
3. Accepting/rejecting suggestions
4. Monitoring batch progress
5. Bulk metadata editing
6. Troubleshooting batch failures

---

## 🎓 Future Enhancements (Post-Implementation)

- Multi-language metadata extraction
- Custom metadata extraction rules
- Machine learning model training (improve over time)
- Integration with library catalogs
- Advanced batch scheduling

---

**Ready to implement! 🚀**
