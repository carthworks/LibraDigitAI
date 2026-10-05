/**
 * Where a document is in the digitization workflow and what the user should
 * do next. Shared by the dashboard cards, table and "Needs attention" panel.
 *
 * Note: saving metadata sets status 'archived' before the archive package is
 * generated, so `has_archive` (from GET /api/projects) decides the last step.
 */
export function nextStep(project) {
    const id = project.id
    switch (project.status) {
        case 'upload':
        case 'ocr':
            return { key: 'ocr', label: 'Run OCR', hint: 'Uploaded, text not extracted yet', path: `/upload?project=${id}`, needsAction: true, progress: 20 }
        case 'cleanup':
            return { key: 'cleanup', label: 'Review text', hint: 'OCR done, check the text', path: `/cleanup/${id}`, needsAction: true, progress: 50 }
        case 'metadata':
            return { key: 'metadata', label: 'Add metadata', hint: 'Text reviewed, describe the document', path: `/metadata/${id}`, needsAction: true, progress: 70 }
        case 'archived':
            if (!project.has_archive) {
                return { key: 'archive', label: 'Create archive', hint: 'Metadata saved, package not built yet', path: `/archive/${id}`, needsAction: true, progress: 90 }
            }
            return { key: 'done', label: 'View archive', hint: project.archive_format || 'Archived', path: `/archive/${id}`, needsAction: false, progress: 100 }
        default:
            return { key: 'ocr', label: 'Run OCR', hint: 'Uploaded', path: `/upload?project=${id}`, needsAction: true, progress: 20 }
    }
}

export const displayTitle = (project) => project.title || project.filename
