import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Suppress findDOMNode warning from react-quill (third-party library issue)
const originalError = console.error
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('findDOMNode')) {
        return
    }
    originalError.call(console, ...args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
