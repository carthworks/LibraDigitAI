import React from 'react'
import { Check, Circle, AlertCircle } from 'lucide-react'
import './WorkflowTracker.css'

const WorkflowTracker = ({ currentStep, projectStatus }) => {
    const steps = [
        { id: 1, label: 'Upload', status: 'upload' },
        { id: 2, label: 'OCR', status: 'ocr' },
        { id: 3, label: 'Cleanup', status: 'cleanup' },
        { id: 4, label: 'Metadata', status: 'metadata' },
        { id: 5, label: 'Archive', status: 'archived' }
    ]

    const getStepState = (step) => {
        const statusOrder = ['upload', 'ocr', 'cleanup', 'metadata', 'archived']
        const currentIndex = statusOrder.indexOf(projectStatus)
        const stepIndex = statusOrder.indexOf(step.status)

        if (stepIndex < currentIndex) return 'completed'
        if (stepIndex === currentIndex) return 'active'
        return 'pending'
    }

    const getStepIcon = (state) => {
        switch (state) {
            case 'completed':
                return <Check size={20} />
            case 'active':
                return <Circle size={20} className="pulse" />
            case 'error':
                return <AlertCircle size={20} />
            default:
                return <Circle size={20} />
        }
    }

    return (
        <div className="workflow-tracker">
            <div className="workflow-steps">
                {steps.map((step, index) => {
                    const state = getStepState(step)
                    return (
                        <React.Fragment key={step.id}>
                            <div className={`workflow-step ${state}`}>
                                <div className="step-icon">
                                    {getStepIcon(state)}
                                </div>
                                <div className="step-label">{step.label}</div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`workflow-connector ${state === 'completed' ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

export default WorkflowTracker
