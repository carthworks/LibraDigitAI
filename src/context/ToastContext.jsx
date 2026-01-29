import React, { createContext, useState, useContext, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import './Toast.css'

const ToastContext = createContext()

export const useToast = () => useContext(ToastContext)

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now().toString()
        const newToast = { id, message, type, duration }

        setToasts(prev => [...prev, newToast])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type} slide-in`}
                        role="alert"
                    >
                        <div className="toast-icon">
                            {toast.type === 'success' && <CheckCircle size={20} />}
                            {toast.type === 'error' && <AlertCircle size={20} />}
                            {toast.type === 'warning' && <AlertTriangle size={20} />}
                            {toast.type === 'info' && <Info size={20} />}
                        </div>
                        <div className="toast-content">
                            <p>{toast.message}</p>
                        </div>
                        <button
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
