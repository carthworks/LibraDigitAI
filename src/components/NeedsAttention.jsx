import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2, Square } from 'lucide-react'
import { displayTitle, nextStep } from '../utils/workflow'

const UP_NEXT_LIMIT = 5

const JOB_LABELS = {
    ocr: 'OCR',
    advanced_ocr: 'Advanced OCR',
    handwritten_to_pdf: 'Handwriting to PDF',
}

/**
 * "What needs me next": documents being processed right now, then the
 * documents waiting on the user, oldest first.
 */
const NeedsAttention = ({ projects, jobs, onStopJob, onShowAll }) => {
    const navigate = useNavigate()
    const byId = new Map(projects.map(p => [p.id, p]))
    const busy = new Set(jobs.map(job => job.project_id))

    const waiting = projects
        .filter(p => !busy.has(p.id) && nextStep(p).needsAction)
        .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))

    if (jobs.length === 0 && waiting.length === 0) {
        return (
            <section className="attention-panel attention-clear" aria-label="Needs your attention">
                <CheckCircle2 size={20} className="text-success" />
                <span>All caught up — every document is archived.</span>
            </section>
        )
    }

    return (
        <section className="attention-panel" aria-label="Needs your attention">
            {jobs.length > 0 && (
                <div className="attention-group">
                    <h2 className="attention-heading">Processing now</h2>
                    <ul className="attention-list">
                        {jobs.map(job => {
                            const project = byId.get(job.project_id)
                            const pct = Math.round(job.progress || 0)
                            return (
                                <li key={job.id} className="attention-row">
                                    <Loader2 size={18} className="spin-anim text-primary" aria-hidden="true" />
                                    <div className="attention-main">
                                        <button
                                            type="button"
                                            className="attention-title link-like"
                                            onClick={() => navigate(`/upload?project=${job.project_id}`)}
                                        >
                                            {project ? displayTitle(project) : `Document ${job.project_id}`}
                                        </button>
                                        <span className="attention-hint">
                                            {JOB_LABELS[job.kind] || job.kind} · {job.status === 'queued' ? 'Queued' : job.message}
                                        </span>
                                        <div
                                            className="attention-progress"
                                            role="progressbar"
                                            aria-label={`Progress for ${project ? displayTitle(project) : 'document'}`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={pct}
                                        >
                                            <div className="attention-progress-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <span className="attention-pct">{job.status === 'queued' ? '—' : `${pct}%`}</span>
                                    <button
                                        type="button"
                                        className="btn-dash-secondary btn-sm"
                                        onClick={() => onStopJob(job)}
                                        disabled={job.message === 'Cancelling…'}
                                    >
                                        <Square size={12} />
                                        <span>Stop</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            {waiting.length > 0 && (
                <div className="attention-group">
                    <h2 className="attention-heading">
                        Up next <span className="tab-count">{waiting.length}</span>
                    </h2>
                    <ul className="attention-list">
                        {waiting.slice(0, UP_NEXT_LIMIT).map(project => {
                            const step = nextStep(project)
                            return (
                                <li key={project.id} className="attention-row">
                                    <span className={`attention-dot step-${step.key}`} aria-hidden="true" />
                                    <div className="attention-main">
                                        <span className="attention-title">{displayTitle(project)}</span>
                                        <span className="attention-hint">{step.hint}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-dash-primary btn-sm"
                                        onClick={() => navigate(step.path)}
                                    >
                                        <span>{step.label}</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                    {waiting.length > UP_NEXT_LIMIT && (
                        <button type="button" className="attention-more link-like" onClick={onShowAll}>
                            Show all {waiting.length} waiting documents
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}

export default NeedsAttention
