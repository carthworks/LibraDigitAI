import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

const FAST_POLL_MS = 1500 // while something is running
const IDLE_POLL_MS = 8000 // picks up jobs started from another page or window

/**
 * Background jobs that are queued or running, kept fresh by polling.
 * onFinished() is called when a job leaves the active list, so callers can
 * reload the documents it changed.
 */
export function useActiveJobs(onFinished) {
    const [jobs, setJobs] = useState([])
    const onFinishedRef = useRef(onFinished)
    onFinishedRef.current = onFinished

    useEffect(() => {
        let cancelled = false
        let timer
        let previous = new Set()

        const poll = async () => {
            let active = previous.size > 0
            try {
                const { data } = await axios.get(`${API_URL}/jobs`, { params: { active: true } })
                if (cancelled) return
                const ids = new Set(data.jobs.map(job => job.id))
                const finished = [...previous].some(id => !ids.has(id))
                previous = ids
                active = ids.size > 0
                setJobs(data.jobs)
                if (finished) onFinishedRef.current?.()
            } catch {
                // Backend unavailable: keep the last known list and retry.
            }
            if (!cancelled) timer = setTimeout(poll, active ? FAST_POLL_MS : IDLE_POLL_MS)
        }

        poll()
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [])

    return jobs
}
