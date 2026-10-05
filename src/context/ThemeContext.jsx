import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => {},
    setTheme: () => {}
})

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        try {
            const saved = localStorage.getItem('libradigit_theme')
            if (saved === 'light' || saved === 'dark') {
                return saved
            }
        } catch (e) {
            console.error('Failed to read theme from localStorage', e)
        }
        return 'dark'
    })

    useEffect(() => {
        try {
            document.documentElement.setAttribute('data-theme', theme)
            if (theme === 'light') {
                document.body.classList.add('light-theme')
                document.body.classList.remove('dark-theme')
            } else {
                document.body.classList.add('dark-theme')
                document.body.classList.remove('light-theme')
            }
            localStorage.setItem('libradigit_theme', theme)
        } catch (e) {
            console.error('Failed to save theme', e)
        }
    }, [theme])

    const toggleTheme = () => {
        setThemeState(prev => (prev === 'light' ? 'dark' : 'light'))
    }

    const setTheme = (newTheme) => {
        if (newTheme === 'light' || newTheme === 'dark') {
            setThemeState(newTheme)
        }
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
export default ThemeContext
