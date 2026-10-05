# LibraDigit AI - Quick Reference

## 🚀 Quick Start Commands

```bash
# Install dependencies (first time only)
npm install
cd backend && pip install -r requirements.txt && cd ..

# Run the application
npm run dev
```

## 📂 File Structure

```
LibraDigit AI/
├── src/                    # Frontend React code
│   ├── components/         # Reusable UI components
│   ├── context/           # State management
│   ├── pages/             # Page components
│   ├── App.jsx            # Main app
│   └── index.css          # Design system
├── backend/               # Python Flask API
│   └── server.py          # API server
├── electron/              # Desktop wrapper
│   └── main.js            # Electron config
└── Archive/               # Generated archives
```

## 🎯 Workflow Steps

1. **Dashboard** → View all projects
2. **Upload & OCR** → Upload document and run OCR
3. **Cleanup** → Edit OCR text
4. **Metadata** → Add title, author, year, subject, keywords
5. **Archive** → Generate structured archive

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/:id` | GET | Get project details |
| `/api/projects/:id` | DELETE | Delete project |
| `/api/ocr/:id` | POST | Run OCR |
| `/api/cleanup/:id` | POST | Save cleaned text |
| `/api/metadata/:id` | POST | Save metadata |
| `/api/archive/:id` | POST | Generate archive |

## 🎨 Design Tokens

### Colors
- **Primary**: `#6366f1` (Indigo)
- **Accent**: `#10b981` (Emerald)
- **Background**: `#0a0a0f` (Deep Dark)
- **Surface**: `#2a2a3a` (Elevated)

### Typography
- **UI Font**: Inter
- **Code Font**: JetBrains Mono

### Spacing
- **xs**: 0.25rem
- **sm**: 0.5rem
- **md**: 1rem
- **lg**: 1.5rem
- **xl**: 2rem

## 🗄️ Database Tables

### projects
- `id` - Primary key
- `filename` - Document name
- `filepath` - File location
- `status` - Current workflow step
- `created_at` - Creation timestamp
- `updated_at` - Last update

### files
- `project_id` - Foreign key
- `original_path` - Original file
- `ocr_path` - OCR processed file
- `cleaned_path` - Cleaned text file
- `final_path` - Archive file

### metadata
- `project_id` - Foreign key
- `title` - Document title (required)
- `author` - Author name
- `year` - Publication year
- `subject` - Subject/category
- `keywords` - Search keywords

### ocr_text
- `project_id` - Foreign key
- `original_text` - Raw OCR output
- `cleaned_text` - User-edited text

## 🔧 Common Tasks

### Add New Page
1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation in `src/components/Sidebar.jsx`

### Add New API Endpoint
1. Add route in `backend/server.py`
2. Add function in `src/context/ProjectContext.jsx`
3. Call from page component

### Modify Design
- Edit `src/index.css` for global styles
- Edit component `.css` files for specific styles

## 📝 Status Values

- `upload` - File uploaded
- `ocr` - OCR processing
- `cleanup` - Text cleanup
- `metadata` - Metadata entry
- `archived` - Archive generated

## 🎯 Archive Structure

```
Archive/
  └── {Subject}/
      └── {Year}/
          └── {Author}_{Year}_{Title}.pdf
```

Example:
```
Archive/
  └── History/
      └── 2023/
          └── Smith_2023_Ancient_Rome.pdf
```

## 🐛 Troubleshooting

### Backend not starting
```bash
cd backend
python server.py
```

### Frontend not loading
```bash
npm run dev:react
```

### Database issues
Delete `libradigit.db` and restart

### Port conflicts
Change ports in:
- `vite.config.js` (frontend)
- `backend/server.py` (backend)

## 📦 Dependencies

### Frontend
- react, react-dom, react-router-dom
- axios, lucide-react
- vite, electron

### Backend
- flask, flask-cors
- pytesseract, Pillow, PyMuPDF

## 🔑 Key Features

- ✅ Offline-first architecture
- ✅ SQLite persistent storage
- ✅ 5-step guided workflow
- ✅ Premium dark UI
- ✅ Real-time progress tracking
- ✅ Form validation
- ✅ Error handling
- ✅ Archive organization

## 📊 Component List

### Components
- Sidebar, Header, WorkflowTracker

### Pages
- Dashboard, UploadOCR, Cleanup, Metadata, Archive

### Context
- ProjectContext (state management)

## 🎨 CSS Classes

### Buttons
- `.btn` - Base button
- `.btn-primary` - Primary action
- `.btn-secondary` - Secondary action
- `.btn-accent` - Success action
- `.btn-ghost` - Minimal button

### Cards
- `.card` - Base card
- `.card-elevated` - With shadow

### Forms
- `.form-group` - Form field wrapper
- `.form-label` - Field label
- `.form-input` - Text input
- `.form-textarea` - Text area

### Badges
- `.badge-primary` - Blue badge
- `.badge-accent` - Green badge
- `.badge-warning` - Orange badge
- `.badge-error` - Red badge

## 🚀 Production Build

```bash
npm run build
```

Output: `dist/` folder

## 📝 Environment

- Node.js: v18+
- Python: v3.8+
- Tesseract: Latest

## 🔗 Useful Links

- Tesseract: https://github.com/tesseract-ocr/tesseract
- Flask: https://flask.palletsprojects.com/
- React: https://react.dev/
- Electron: https://www.electronjs.org/

---

**Quick Tip**: Use `npm run dev` for everything!
