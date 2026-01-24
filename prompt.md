

You are building a desktop/web application called **LibraDigit AI** for librarians to create searchable digital archives from scanned documents.

Follow this strictly:

The app must have:

* Proper UI
* Persistent memory (local storage + database)
* Clear views for each workflow step
* Strong error handling and user guidance
* Offline-first design

This is a production tool, not a demo.

---

APP VIEWS (UI SCREENS)

1. Home Dashboard
   Purpose:
   Show project status and workflow progress.

UI:

* Button: “Start New Digitization Project”
* List of existing projects:

  * File name
  * Current step (OCR / Cleanup / Metadata / Archived)
  * Progress bar

Memory:

* Store project info in SQLite:

  ```
  projects(id, filename, status, created_at, updated_at)
  ```

Errors:

* If no projects exist → show onboarding tips.
* If project data missing → show recovery option.

---

2. Upload & OCR View
   Purpose:
   Convert scanned documents to searchable PDFs.

UI:

* File upload area (PDF / Image)
* Button: Run OCR
* Preview:

  * Original
  * OCR output

Memory:

* Save file path
* Save OCR result path

Errors:

* File type invalid → “Only PDF or image files allowed”
* OCR failure → “OCR engine failed. Check installation”
* File corrupted → “File cannot be processed”

---

3. OCR Cleanup View
   Purpose:
   Improve text accuracy.

UI:

* Split screen:

  * Left: original image
  * Right: editable OCR text
* Save cleaned text button

Memory:

* Store cleaned text version

Errors:

* Empty save → “Text cannot be empty”
* Encoding error → “Invalid characters detected”

---

4. Metadata View
   Purpose:
   Make document discoverable.

UI:
Form fields:

* Title (required)
* Author
* Year
* Subject
* Keywords (comma separated)

Memory:

```
metadata(project_id, title, author, year, subject, keywords)
```

Errors:

* Missing title → “Title is mandatory”
* Invalid year → “Year must be numeric”
* Empty keywords → warning, not block

---

5. Archive Builder View
   Purpose:
   Create structured digital archive.

UI:

* Show final file name preview:

  ```
  Author_Year_Title.pdf
  ```
* Show folder structure preview:

  ```
  Archive/Subject/Year/
  ```
* Button: “Generate Archive File”

Memory:

* Save final file path
* Save archive status

Errors:

* Folder permission denied
* Disk full
* Duplicate filename detected

---

6. Workflow Tracker View
   Purpose:
   Make the pipeline visible.

Steps:

1. Upload
2. OCR
3. Cleanup
4. Metadata
5. Archive

UI:

* Progress indicator
* Completed steps in green
* Failed steps in red

---

MEMORY DESIGN

Use:

* SQLite for metadata + project status
* Local file system for PDFs and outputs

Tables:

```
projects(id, name, status)
files(project_id, original_path, ocr_path, cleaned_path, final_path)
metadata(project_id, title, author, year, subject, keywords)
```

Must persist after app restart.

---

ERROR HANDLING RULES

Every error must:

1. Be human-readable
2. Explain what happened
3. Suggest what to do

Examples:

| Error Type         | Message                                             |
| ------------------ | --------------------------------------------------- |
| OCR engine missing | "OCR engine not found. Please install Tesseract."   |
| File upload failed | "Unable to read file. Please check file integrity." |
| Save failed        | "Unable to save project. Check disk space."         |
| Metadata missing   | "Title is required to continue."                    |

No stack traces shown to user.

---

TRAINING MODE (Optional Toggle)

When enabled:

* Shows tooltips at every step
* Forces workflow order
* Generates project report:

  ```
  Problem
  Tool used
  Workflow
  Result
  Time saved
  ```

---

QUALITY RULES

* Must work offline
* Must not send data to cloud
* Must complete a full workflow without crashes
* Must handle at least 100 documents without memory leak

---

FINAL COMMAND TO AI:

> Build a production-grade application following the above PRD with:
>
> * Modular UI views
> * Persistent memory
> * Linear workflow
> * Strong error handling
> * Offline-first architecture
>   This is an enterprise librarian tool, not a prototype.

---

This prompt alone is strong enough to generate:

* UI design
* Backend logic
* Database schema
* Error handling system
* Workflow engine

It turns your idea into a real product spec.
