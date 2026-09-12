# Enhanced Text Editor Component

## Overview

A feature-rich text editor component specifically designed for OCR text cleanup with advanced editing capabilities.

## Features

### 🔄 Undo/Redo System
- **Automatic history tracking** - Saves changes every 500ms
- **Keyboard shortcuts:**
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- **Visual feedback** - Buttons disabled when at history limits
- **Unlimited history** - All changes tracked during session

### 🔍 Find & Replace
- **Find text** - Search with live match counting
- **Replace one** - Replace current match
- **Replace all** - Replace all matches at once
- **Match navigation** - Jump between matches
- **Keyboard shortcuts:**
  - `Ctrl+F` - Open find panel
  - `Ctrl+H` - Open find & replace panel
  - `Enter` in find field - Find next
  - `Enter` in replace field - Replace current

### 🔤 Text Formatting
- **Font size control** - Zoom in/out (10px - 24px)
- **Word wrap toggle** - Switch between wrapped and horizontal scroll
- **Tab support** - Insert 4 spaces with Tab key
- **Monospace font** - Better readability for OCR text
- **Spell check** - Built-in browser spell checking

### 📊 Statistics
- **Real-time counters:**
  - Line count
  - Word count
  - Character count
- **Always visible** - Displayed in toolbar

### 📋 Quick Actions
- **Copy** - Copy selected text or entire content
- **Keyboard shortcuts** - Full keyboard navigation support

### 💡 OCR Helpers
- **Common error tips** - Built-in hints for typical OCR mistakes:
  - "rn" → "m"
  - "0" (zero) → "O" (letter)
  - "1" (one) → "l" (L)
  - Missing spaces
  - Special characters

## Component API

### Props

```jsx
<TextEditor
  value={string}              // Current text content
  onChange={function}         // Change handler (e) => void
  placeholder={string}        // Placeholder text (optional)
/>
```

### Example Usage

```jsx
import TextEditor from '../components/TextEditor'

function MyComponent() {
  const [text, setText] = useState('')

  return (
    <TextEditor
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Enter your text here..."
    />
  )
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo last change |
| `Ctrl+Y` | Redo last undone change |
| `Ctrl+Shift+Z` | Redo (alternative) |
| `Ctrl+F` | Open find panel |
| `Ctrl+H` | Open find & replace panel |
| `Tab` | Insert 4 spaces |
| `Enter` (in find) | Find next match |
| `Enter` (in replace) | Replace current match |

## UI Components

### Toolbar
- **Undo/Redo buttons** - With disabled states
- **Copy button** - Copy selected or all text
- **Find/Replace toggle** - Opens search panel
- **Zoom controls** - Increase/decrease font size
- **Word wrap toggle** - Active state indicator
- **Statistics display** - Lines, words, characters

### Find & Replace Panel
- **Find input** - With match counter
- **Replace input** - For replacement text
- **Next button** - Navigate to next match
- **Replace button** - Replace current match
- **Replace All button** - Replace all matches
- **Slide-down animation** - Smooth appearance

### Text Area
- **Monospace font** - JetBrains Mono or Courier New
- **Custom scrollbar** - Styled for dark theme
- **Syntax highlighting** - Selection highlighting
- **Auto-resize** - Fills available space

### OCR Tips Section
- **Visual hints** - Common OCR error patterns
- **Quick reference** - Always visible at bottom
- **Styled badges** - Easy-to-scan format

## Styling

### CSS Variables Used
- `--color-surface` - Editor background
- `--color-bg-secondary` - Toolbar background
- `--color-border` - Border colors
- `--color-primary` - Primary actions
- `--color-accent` - Success states
- `--color-text-*` - Text hierarchy
- `--font-mono` - Monospace font
- `--space-*` - Spacing scale
- `--radius-*` - Border radius scale
- `--transition-*` - Animation timing

### Responsive Design
- **Desktop** - Full toolbar with all features
- **Tablet** - Wrapped toolbar, maintained functionality
- **Mobile** - Stacked layout, touch-friendly buttons

## Performance

### Optimizations
- **Debounced history** - Saves every 500ms to prevent excessive updates
- **Efficient search** - Uses native regex for find/replace
- **Minimal re-renders** - Only updates when necessary
- **Lazy calculations** - Stats computed only on change

### Memory Management
- **History limit** - Consider implementing max history size for very long sessions
- **Text area** - Native browser element for best performance

## Accessibility

### Features
- **Keyboard navigation** - Full keyboard support
- **Focus indicators** - Clear visual feedback
- **ARIA labels** - Screen reader support (can be enhanced)
- **Semantic HTML** - Proper element usage
- **Color contrast** - WCAG AA compliant

### Improvements Possible
- Add ARIA labels to all buttons
- Announce match counts to screen readers
- Add keyboard shortcuts help dialog
- Improve focus management in modals

## Browser Compatibility

### Supported
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Opera (latest)

### Features
- **Clipboard API** - Modern browsers only
- **CSS Grid/Flexbox** - All modern browsers
- **Custom scrollbars** - WebKit browsers (Chrome, Safari, Edge)

## Integration with Cleanup Page

### Before
```jsx
<textarea
  className="cleanup-textarea"
  value={cleanedText}
  onChange={(e) => setCleanedText(e.target.value)}
  placeholder="OCR extracted text will appear here..."
  spellCheck={true}
/>
```

### After
```jsx
<TextEditor
  value={cleanedText}
  onChange={(e) => setCleanedText(e.target.value)}
  placeholder="OCR extracted text will appear here..."
/>
```

### Benefits
- ✅ **Better UX** - Professional editing experience
- ✅ **More features** - Find/replace, undo/redo, zoom
- ✅ **OCR-specific** - Tailored for OCR cleanup workflow
- ✅ **Consistent** - Matches app design system
- ✅ **Productive** - Keyboard shortcuts for power users

## Future Enhancements

### Possible Features
1. **Syntax highlighting** - Highlight potential OCR errors
2. **Auto-correction** - Suggest common fixes
3. **Diff view** - Compare original vs cleaned text
4. **Export options** - Save as TXT, DOCX, etc.
5. **Themes** - Light/dark mode toggle
6. **Custom shortcuts** - User-configurable hotkeys
7. **Macro recording** - Record and replay edits
8. **AI suggestions** - ML-powered error detection
9. **Collaborative editing** - Real-time multi-user
10. **Version history** - Save multiple versions

### Technical Improvements
1. **Virtual scrolling** - For very large documents
2. **Web Workers** - Offload search to background thread
3. **IndexedDB** - Persist history across sessions
4. **Code splitting** - Lazy load editor features
5. **Performance monitoring** - Track and optimize

## Troubleshooting

### Common Issues

**Q: Undo/Redo not working**
- Check if history is being updated
- Verify keyboard shortcuts aren't blocked
- Ensure component is receiving onChange events

**Q: Find not highlighting matches**
- Check if regex is valid
- Verify text area has focus
- Ensure selection API is supported

**Q: Slow performance with large text**
- Consider debouncing onChange handler
- Implement virtual scrolling
- Limit history size

**Q: Styling issues**
- Verify CSS variables are defined
- Check for conflicting styles
- Ensure TextEditor.css is imported

## Files

### Component Files
- `src/components/TextEditor.jsx` - Main component
- `src/components/TextEditor.css` - Component styles

### Integration
- `src/pages/Cleanup.jsx` - Uses TextEditor
- `src/pages/Cleanup.css` - Page styles

## Summary

The enhanced TextEditor component provides a professional, feature-rich editing experience specifically designed for OCR text cleanup. With undo/redo, find/replace, zoom controls, and OCR-specific helpers, it significantly improves the user experience compared to a basic textarea.

**Key Benefits:**
- 🚀 **Productivity** - Keyboard shortcuts and quick actions
- 🎯 **Purpose-built** - Designed for OCR cleanup workflow
- 💎 **Professional** - Polished UI matching app design
- 📱 **Responsive** - Works on all screen sizes
- ♿ **Accessible** - Keyboard navigation and semantic HTML
