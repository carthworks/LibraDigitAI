import axios from 'axios'
import { API_URL } from '../config'

const POLL_INTERVAL_MS = 700
const TERMINAL = new Set(['completed', 'failed', 'cancelled'])

export class JobCancelledError extends Error {
    constructor() {
        super('Processing was cancelled')
        this.name = 'JobCancelledError'
    }
}

const errorMessage = (err, fallback) => err.response?.data?.error || err.message || fallback

/**
 * Start a background job. If the project already has one running, the
 * existing job is returned so the caller can follow it instead.
 */
export async function startJob(kind, projectId, params = {}) {
    try {
        const { data } = await axios.post(`${API_URL}/jobs`, { kind, project_id: projectId, params })
        return data.job
    } catch (err) {
        if (err.response?.status === 409 && err.response.data?.job) return err.response.data.job
        throw new Error(errorMessage(err, 'Could not start processing'))
    }
}

export async function getJob(jobId) {
    const { data } = await axios.get(`${API_URL}/jobs/${jobId}`)
    return data.job
}

export async function cancelJob(jobId) {
    const { data } = await axios.post(`${API_URL}/jobs/${jobId}/cancel`)
    return data.job
}

export async function findActiveJob(projectId) {
    const { data } = await axios.get(`${API_URL}/jobs`, { params: { project_id: projectId, active: true } })
    return data.jobs[0] || null
}

/**
 * Poll a job until it finishes. Calls onProgress(job) on every update and
 * resolves with the job result; rejects with the job error or JobCancelledError.
 */
export async function waitForJob(jobId, { onProgress, signal } = {}) {
    let failures = 0
    for (;;) {
        if (signal?.aborted) throw new DOMException('Stopped following job', 'AbortError')
        let job
        try {
            job = await getJob(jobId)
            failures = 0
        } catch (err) {
            // Tolerate brief backend hiccups; the job keeps running server-side.
            if (++failures >= 5) throw new Error(errorMessage(err, 'Lost contact with the processing engine'))
        }
        if (job) {
            onProgress?.(job)
            if (TERMINAL.has(job.status)) {
                if (job.status === 'completed') return job.result
                if (job.status === 'cancelled') throw new JobCancelledError()
                throw new Error(job.error || 'Processing failed')
            }
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
}

/** Start a job and wait for it to finish. */
export async function runJob(kind, projectId, params, options) {
    const job = await startJob(kind, projectId, params)
    options?.onStart?.(job)
    return waitForJob(job.id, options)
}
