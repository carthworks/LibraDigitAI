# Export System Quick Reference

## 🎯 Quick Start

### Export a Single Project
1. **Navigate**: Sidebar → Export System
2. **Mode**: Single Export
3. **Select**: Choose archived project
4. **Configure**: 
   - Metadata formats: Dublin Core, MODS, JSON
   - Identifier: UUID (recommended)
   - Validation: Enabled
5. **Export**: Click Export button

### Batch Export Multiple Projects
1. **Navigate**: Sidebar → Export System
2. **Mode**: Batch Export
3. **Select**: Check multiple archived projects
4. **Configure**: Identifier type (UUID)
5. **Export**: Click "Export to CSV"

---

## 📋 Metadata Formats

| Format | Best For | Standard | Extension |
|--------|----------|----------|-----------|
| **Dublin Core** | Maximum compatibility | ISO 15836 | `.xml` |
| **MODS** | Rich library metadata | Library of Congress | `.xml` |
| **JSON** | Modern APIs | Custom | `.json` |
| **CSV** | Bulk operations | RFC 4180 | `.csv` |

### When to Use What

- **DSpace/Fedora**: Dublin Core XML
- **Koha/Alma**: MODS XML
- **Custom API**: JSON
- **Bulk Import**: CSV

---

## 🔑 Persistent Identifiers

| Type | Format | Use Case |
|------|--------|----------|
| **UUID** | `550e8400-e29b-41d4-a716-446655440000` | General purpose ✅ |
| **ARK** | `ark:/12345/abc123def456` | Cultural heritage |
| **Handle** | `10.12345/abc123def456` | Academic institutions |

**Recommendation**: Use UUID unless you have specific institutional requirements.

---

## ✅ Validation Checks

The system automatically validates:

- ✅ **Not Encrypted**: PDF is not password-protected
- ✅ **Has Pages**: Document contains content
- ✅ **Has Metadata**: Embedded metadata exists
- ✅ **Searchable**: Text layer is present
- ✅ **Checksum**: MD5 hash calculated

**What to do if validation fails**:
1. Review specific issues listed
2. Re-process the file if needed
3. Re-run OCR if text layer is missing
4. Document exceptions if necessary

---

## 📦 Export Package Contents

Every export includes:

```
export_package/
├── [identifier].pdf          ← Your digitized file
├── [identifier]_dublin_core.xml
├── [identifier]_mods.xml
├── [identifier]_metadata.json
└── README.txt               ← Human-readable info
```

---

## 🔄 Integration Workflows

### DSpace
```
1. Export → CSV (batch mode)
2. Convert → Simple Archive Format
3. Import → DSpace batch import
```

### Koha
```
1. Export → MODS XML
2. Convert → MARC21
3. Import → Koha batch tools
```

### Custom Repository
```
1. Export → JSON
2. POST → Your API endpoint
3. Reference → By persistent identifier
```

---

## 💡 Best Practices

### ✅ DO
- Always validate before final export
- Use UUID for general purposes
- Export multiple formats for flexibility
- Keep persistent identifiers stable
- Reference by ID, not file path

### ❌ DON'T
- Don't rely on folder names for metadata
- Don't change identifiers after creation
- Don't skip validation
- Don't use file paths as source of truth

---

## 🚨 Troubleshooting

### Export Button Disabled
**Cause**: No archived projects available
**Solution**: Complete archival workflow for at least one project

### Validation Failed
**Cause**: PDF doesn't meet archival standards
**Solution**: Check specific issues and re-process if needed

### No Identifier Found
**Cause**: First time exporting this project
**Solution**: Identifier auto-generated on first export

### Export Error
**Cause**: File not found or permissions issue
**Solution**: Verify file exists and export folder is writable

---

## 📊 Export Modes Comparison

| Feature | Single Export | Batch Export |
|---------|--------------|--------------|
| **Projects** | One at a time | Multiple |
| **Formats** | All formats | CSV only |
| **Output** | Complete package | Single CSV file |
| **Use Case** | Detailed export | Bulk import |
| **Validation** | Optional | N/A |

---

## 🎓 Understanding the Philosophy

### Traditional Approach ❌
```
/Archive/
  /History/
    /1950/
      document.pdf  ← Metadata in folder names
```
**Problem**: Breaks when moved, not machine-readable

### Preservation Approach ✅
```
/exports/
  550e8400-e29b-41d4-a716-446655440000.pdf
  550e8400-e29b-41d4-a716-446655440000_dublin_core.xml
```
**Benefit**: Identifier is source of truth, works anywhere

---

## 📞 Need Help?

1. **Documentation**: See `EXPORT_SYSTEM_DOCUMENTATION.md`
2. **Implementation**: See `EXPORT_IMPLEMENTATION_SUMMARY.md`
3. **In-App**: Sidebar → Help & Guide

---

## 🔗 Quick Links

- **Export System**: `/export` in app
- **API Docs**: See full documentation
- **GitHub**: carthworks/LibraDigitAI

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: ✅ Production Ready
