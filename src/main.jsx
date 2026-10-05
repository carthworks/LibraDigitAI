import './styles/app.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import initConsoleSignature from './utils/consoleSignature'

// Initialize styled developer signature & DevTools helper
initConsoleSignature()

// Suppress findDOMNode warning from react-quill (third-party library issue)
const originalError = console.error
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('findDOMNode')) {
        return
    }
    originalError.call(console, ...args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
)


