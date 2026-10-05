# LibraDigit AI — Security & QA Audit

**Date:** 2026-10-05 · **Scope:** Flask backend, React frontend, Electron shell, build/deploy config, dependencies · **Baseline commit:** `63ff06d`

## Summary

The original backend had several issues that could be chained into **remote file theft and file writes from any web page the user visited**. The API listened on localhost with no authentication, reflected every origin in its CORS headers, saved uploads under client-supplied filenames, and served whatever file path a project record pointed to. All critical and high findings are fixed and covered by regression tests (`backend/tests/`, 25 tests).

| Severity | Found | Fixed | Open |
|---|---|---|---|
| Critical | 3 | 3 | 0 |
| High | 6 | 6 | 0 |
| Medium | 9 | 7 | 2 |
| Low / QA | 18 | 17 | 1 |

## How findings were verified

- Each critical finding was reproduced with a proof of concept against the original `server.py` before fixing.
- After fixing, each one was re-tested by an automated regression test.
- The OCR workflow was run end to end with real Tesseract 5.3: image, scanned PDF, born-digital PDF, a text file disguised as a PDF, and batch processing.
- A real Chromium browser drove the built frontend against the new backend: upload → OCR → cleanup → search → analytics/settings/batch/help. There were no page errors and no failed API calls.
- The new backend was started on a database created by the old code, to confirm existing installs upgrade cleanly.

## Critical

| ID | Finding | Fix |
|---|---|---|
| C1 | **Path traversal on upload.** `file.filename` was joined to the upload folder unchecked. Uploading `../../x` wrote outside `uploads/` (reproduced). | `security.safe_upload_path`: basename + `secure_filename`, extension allowlist, unique name. |
| C2 | **Arbitrary file read.** `POST /api/projects` (JSON) accepted any `filepath`, and `GET /api/projects/<id>/file` then served it. `/etc/hostname` was read back (reproduced). | Client paths are ignored. File serving is restricted to the upload and archive folders (`security.is_within`). |
| C3 | **Any website could drive the API.** `CORS(app)` reflected every origin, and there was no auth or CSRF protection. A page the user visited could chain C1/C2, delete projects, or change settings. | Origin allowlist enforced server-side (`api_guard`), not just through CORS headers. In the desktop build, Electron generates a per-launch secret token and injects it into its own requests; the backend rejects requests without it. |

## High

| ID | Finding | Fix |
|---|---|---|
| H1 | `app.run(debug=True)` — Werkzeug debugger and verbose errors in every run. | Debug off by default (`LIBRADIGIT_DEBUG`); explicit `127.0.0.1` bind. |
| H2 | Error responses returned full tracebacks (`details: traceback.format_exc()`). | Central error handler; tracebacks go to the log only. |
| H3 | Electron `preload` exposed `shell.openExternal(url)` with no scheme check. An XSS could open `file:`/`smb:`/custom-protocol URLs and launch programs. | Only `http(s):`/`mailto:` are allowed. Added `setWindowOpenHandler` and a `will-navigate` guard. |
| H4 | Password reset skipped recovery-key verification when the key field was left blank. | The key is now always required when one is stored. Recovery keys use `crypto.getRandomValues`. |
| H5 | `npm audit`: axios (high), lodash (high), form-data (high), plus follow-redirects, dompurify, `@remix-run/router` (moderate). | `npm audit fix` (non-breaking). |
| H6 | PyPDF2 is deprecated and unmaintained (known malformed-PDF DoS issues), and it parsed every uploaded PDF. | Removed. PyMuPDF (already a dependency) now does extraction, merging and metadata. |

## Medium

| ID | Finding | Status |
|---|---|---|
| M1 | Search passed raw user input to FTS5 `MATCH`. Quotes and operators caused 500s (reproduced). `limit` was unbounded, and a non-numeric value caused a 500. | Fixed — every term is quoted; `limit` is clamped to 1–100. |
| M2 | OCR `language` went to Tesseract unvalidated. | Fixed — validated against `^[A-Za-z_]+(\+…)*$`. |
| M3 | No upload size limit. | Fixed — `MAX_CONTENT_LENGTH` (200 MB, configurable). |
| M4 | Settings accepted any value (relative paths, newlines, unknown enum values). | Fixed — absolute paths only; enum and length validation. |
| M5 | ReportLab `Paragraph` was given raw document text and titles. Markup in a document broke conversion and allowed injection into generated PDFs. | Fixed — text is escaped. |
| M6 | Deleting a project left search-index rows, suggestions, batch items and uploaded files behind (reproduced). | Fixed. |
| M7 | Bulk metadata accepted unbounded and untyped `project_ids`. | Fixed. |
| M8 | **Open:** `react-quill` bundles Quill 1.3.7 (GHSA-4943-9vgg-gr5r, XSS). Exposure is limited: the editor only holds the user's own OCR text. | Recommend migrating to `react-quill-new` (Quill 2). |
| M9 | **Open:** `react-router` 6.x advisories (open redirect via backslash; SSR deserialization). The app only navigates to internal paths and has no SSR. | Recommend upgrading to v7 in a dedicated PR. |

## Low / QA defects

| ID | Finding | Status |
|---|---|---|
| Q1 | OCR text contained literal `\n\n` characters instead of newlines (`"\\n\\n"`). | Fixed |
| Q2 | Search snippets came from FTS column 2 (**author**) instead of 3 (**content**). | Fixed |
| Q3 | The configured archive folder was ignored; archives always went to the default folder. | Fixed |
| Q4 | Batch **Cancel** didn't stop the worker. It finished the "cancelled" items and then marked the batch `completed`. Starting a batch twice ran two workers. | Fixed |
| Q5 | Batch OCR skipped scanned PDFs ("No text found"), ignored the language setting, and didn't create searchable PDFs. | Fixed — shares the single-document pipeline. |
| Q6 | Basic OCR and image Advanced OCR didn't update the search index. Cleaned text was never indexed. | Fixed |
| Q7 | Two uploads with the same filename overwrote each other. | Fixed |
| Q8 | Analytics storage counted only the top level of `Archive/`, so archives were reported as ~0 bytes. | Fixed |
| Q9 | The searchable PDF downloaded as `Searchable_<name>.png`. | Fixed |
| Q10 | `Cleanup` → "Highlight uncertain" crashed on OCR words containing regex characters (`(`, `?`, `+`). | Fixed |
| Q11 | Translate failed on documents over 5,000 characters (Google's limit). | Fixed — paragraph-chunked; can be disabled with `LIBRADIGIT_ENABLE_TRANSLATION=false`. |
| Q12 | BagIt packages lacked the required `bagit.txt`, used a fake "123 Digital Way" address, and only had MD5. | Fixed — `bagit.txt`, institution name, SHA-256 manifest. |
| Q13 | `init_search_index` / `update_search_index` were each defined twice (the later definitions silently won). | Fixed (refactor) |
| Q14 | `PDFViewer.jsx` was dead code that loaded the pdf.js worker from a CDN (breaks offline, wrong file for pdf.js v5). | Removed |
| Q15 | `requirements.txt` listed spaCy, NLTK, pycryptodome and python-dateutil, none of which are imported (hundreds of MB of install and bundle size). | Removed |
| Q16 | Invalid project status values were accepted. | Fixed |
| Q17 | `vercel.json` set the deprecated `X-XSS-Protection: 1` and had no HSTS or Permissions-Policy. | Fixed |
| Q18 | **Open:** Login is client-side only (a bcrypt hash in `localStorage`). It is a UI lock, not access control, and "Quick Access" sets the password to `admin123` if none exists. Real access control is now the backend token/origin guard. | Documented — consider hiding Quick Access in desktop builds. |

## Performance & scalability changes

| Area | Before | After |
|---|---|---|
| Initial JS (gzip) | 451 KB, one chunk | **~100 KB** (app + React + landing). Pages and heavy libraries (charts, PDF, editor) load on demand. |
| Initial CSS | 195 KB | 195 KB (31 KB gzip). *Correction:* the 30 KB figure first reported here came from per-page CSS splitting, which broke shared styles (unstyled buttons on directly-opened pages). CSS is one ordered stylesheet again (`src/styles/app.css`), verified identical to the original. |
| Web build / installer payload | ~38 MB (`public/` held 33 MB of unused posters/PDFs) | 5.5 MB |
| Long OCR | Blocking HTTP request (minutes for large PDFs) | Background jobs with per-page progress, cancel, restart recovery (`/api/jobs`) |
| Tesseract passes per page | 3 (`image_to_pdf`, `image_to_string`, `image_to_data`) | 2 — text is rebuilt from `image_to_data` (output verified identical). |
| PDF text extraction | PyPDF2 | PyMuPDF (much faster, better text) |
| SQLite | Default journal; no index on `project_id` FKs | WAL + busy timeout (the batch worker no longer blocks the UI); indexes on every `project_id` and `created_at`. |
| Backend structure | One 2,726-line `server.py` | `app/` package: config, db, security, search index, services, 5 blueprints, processors. Tests and scripts are separate. |

## Recommended next steps

1. Migrate `react-quill` → `react-quill-new` and `react-router-dom` → v7 (M8, M9).
2. Centralize frontend API calls in `src/api/` (endpoints are currently built ad hoc across many pages, mixing `fetch` and `axios`).
3. Add a Content-Security-Policy to `vercel.json` and the Electron window once the Google Fonts dependency is self-hosted.
4. Move OCR to a job queue (the batch worker pattern) for the single-document endpoints too, so large PDFs don't hold an HTTP request open.
5. Add CI that runs `pytest` and `npm run build` on each PR.
6. Verify the Electron token flow in a packaged Windows build. It could not be run in this environment (no Electron binary).
