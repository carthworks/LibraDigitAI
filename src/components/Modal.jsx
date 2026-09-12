import React, { useEffect, useRef, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './Modal.css'

const modalRoot = document.getElementById('modal-root') || document.body

const Modal = memo(({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) => {
    const modalRef = useRef(null)

    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        if (!isOpen) return

        document.addEventListener('keydown', handleEscape)
        modalRef.current?.focus()

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, handleEscape])

    if (!isOpen) return null

    return createPortal(
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={onClose}
        >
            <div
                className={`modal-content modal-${size} ${className}`}
                ref={modalRef}
                tabIndex={-1}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="modal-header">
                    <h3 id="modal-title">{title}</h3>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </header>

                <section className="modal-body">
                    {children}
                </section>

                {footer && (
                    <footer className="modal-footer">
                        {footer}
                    </footer>
                )}
            </div>
        </div>,
        modalRoot
    )
})

export default Modal
