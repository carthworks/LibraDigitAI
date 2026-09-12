# Preservation Export System Documentation

## Overview

The **Preservation Export System** is a comprehensive digital asset export pipeline designed for LibraDigit AI. It treats digital preservation as a first-class concern, not an afterthought. Every export includes:

- **Persistent Identifiers**: Stable, globally unique IDs (UUID, ARK, Handle)
- **Structured Metadata**: Machine-readable formats (Dublin Core, MODS, JSON, CSV)
- **Archival Validation**: Automated compliance checks for long-term preservation
- **System-Ready Packages**: Designed for repository systems (DSpace, Koha, etc.)

## Philosophy

### Preservation-First Architecture

The export system follows these core principles:

1. **Identifiers are Primary**: Every asset gets a persistent identifier that serves as the source of truth
2. **Metadata is Machine-Readable**: All metadata is structured and standards-compliant
3. **Folders are Convenience**: Directory structure is for humans; systems rely on IDs and metadata
4. **Validation is Mandatory**: Files are checked for archival compliance before export
5. **Future-Proof Design**: Exports outlive platforms, vendors, and storage locations

### The Problem with Traditional Exports

Traditional "export" systems often:
- Rely on folder names and file paths as the source of truth
- Use inconsistent or proprietary metadata formats
- Lack persistent identifiers
- Don't validate archival compliance
- Create vendor lock-in

This system solves all of these issues.

## Features

### 1. Persistent Identifiers

Every exported asset receives a stable identifier that never changes:

#### UUID (Universally Unique Identifier)
- **Format**: `550e8400-e29b-41d4-a716-446655440000`
- **Standard**: RFC 4122
- **Use Case**: General purpose, globally unique
- **Advantages**: No central authority needed, instant generation

#### ARK (Archival Resource Key)
- **Format**: `ark:/12345/abc123def456`
- **Standard**: California Digital Library
- **Use Case**: Cultural heritage institutions, long-term preservation
- **Advantages**: Designed for permanence, supports versioning

#### Handle System
- **Format**: `10.12345/abc123def456`
- **Standard**: CNRI Handle System
- **Use Case**: Academic institutions, DOI-like identifiers
- **Advantages**: Distributed resolution, widely adopted

### 2. Metadata Formats

#### Dublin Core XML
- **Standard**: ISO 15836
- **Elements**: 15 core elements (Title, Creator, Subject, etc.)
- **Use Case**: Maximum interoperability, simple metadata
- **Compatible With**: Most repository systems, OAI-PMH harvesters

Example:
```xml
<?xml version="1.0" ?>
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier>550e8400-e29b-41d4-a716-446655440000</dc:identifier>
  <dc:title>Historical Document</dc:title>
  <dc:creator>John Smith</dc:creator>
  <dc:date>1950</dc:date>
  <dc:format>application/pdf</dc:format>
</metadata>
```

#### MODS XML (Metadata Object Description Schema)
- **Standard**: Library of Congress
- **Use Case**: Detailed bibliographic metadata
- **Compatible With**: Digital library systems, MARC converters

Features:
- Hierarchical structure
- Rich name/role information
- Physical description
- Subject classification
- Origin information

#### JSON Metadata
- **Standard**: Custom (JSON Schema compatible)
- **Use Case**: Modern APIs, web services, NoSQL databases
- **Advantages**: Easy to parse, human-readable, flexible

Structure:
```json
{
  "identifier": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "title": "Historical Document",
    "author": "John Smith",
    "year": "1950"
  },
  "technical": {
    "format": "application/pdf",
    "checksum": {
      "algorithm": "md5",
      "value": "abc123..."
    }
  }
}
```

#### CSV Export
- **Standard**: RFC 4180
- **Use Case**: Bulk imports, spreadsheet analysis, batch processing
- **Advantages**: Universal compatibility, easy to edit

Columns include:
- identifier
- title
- author
- year
- subject
- keywords
- format
- file_size
- checksum_md5
- file_path
- created_date

### 3. File Validation

Automated checks ensure archival compliance:

#### PDF Validation
- **Encryption Check**: Ensures PDF is not password-protected
- **Page Count**: Verifies document has content
- **Metadata Check**: Confirms embedded metadata exists
- **Text Layer Check**: Validates searchable text is present

#### Validation Results
Each validation provides:
- **Pass/Fail Status**: Clear indication of compliance
- **Issue List**: Specific problems found
- **Recommendations**: How to fix issues

### 4. Export Modes

#### Single Project Export
Export one project with all selected metadata formats:

1. Select project from archived items
2. Choose metadata formats (Dublin Core, MODS, JSON)
3. Select identifier type (UUID, ARK, Handle)
4. Enable/disable validation
5. Export generates complete package

**Output Structure**:
```
export_123_20260130_203045/
├── 550e8400-e29b-41d4-a716-446655440000.pdf
├── 550e8400-e29b-41d4-a716-446655440000_dublin_core.xml
├── 550e8400-e29b-41d4-a716-446655440000_mods.xml
├── 550e8400-e29b-41d4-a716-446655440000_metadata.json
└── README.txt
```

#### Batch CSV Export
Export multiple projects to a single CSV file for bulk repository import:

1. Select multiple archived projects
2. Choose identifier type
3. Export generates CSV with all metadata

**Use Cases**:
- Bulk import into DSpace
- Batch cataloging in Koha
- Spreadsheet analysis
- Database import

### 5. Export Package Contents

Every export package includes:

1. **Primary Asset**: The digitized file (PDF, TIFF, etc.)
2. **Metadata Files**: Selected formats (Dublin Core, MODS, JSON)
3. **README.txt**: Human-readable documentation
4. **Checksums**: MD5 hashes for integrity verification
5. **Validation Report**: If validation was enabled

## API Endpoints

### Export Single Project
```
POST /api/export/project/<project_id>
```

Request:
```json
{
  "formats": ["dublin_core", "mods", "json"],
  "id_type": "uuid",
  "validate": true
}
```

Response:
```json
{
  "success": true,
  "identifier": "550e8400-e29b-41d4-a716-446655440000",
  "export_path": "/path/to/export",
  "files": {
    "file": "550e8400-e29b-41d4-a716-446655440000.pdf",
    "dublin_core": "550e8400-e29b-41d4-a716-446655440000_dublin_core.xml",
    "mods": "550e8400-e29b-41d4-a716-446655440000_mods.xml",
    "json": "550e8400-e29b-41d4-a716-446655440000_metadata.json"
  },
  "validation": {
    "is_valid": true,
    "issues": []
  }
}
```

### Batch CSV Export
```
POST /api/export/batch
```

Request:
```json
{
  "project_ids": [1, 2, 3, 4, 5],
  "id_type": "uuid",
  "filename": "batch_export.csv"
}
```

### Get Persistent Identifier
```
GET /api/export/identifier/<project_id>?type=uuid
```

### Validate Project File
```
GET /api/export/validate/<project_id>
```

### Get Available Formats
```
GET /api/export/formats
```

## Integration with Repository Systems

### DSpace Integration

1. **Export to CSV**: Use batch export to generate CSV
2. **Import via SAF**: Convert CSV to Simple Archive Format
3. **Metadata Mapping**: Dublin Core maps directly to DSpace

### Koha Integration

1. **Export to MODS**: Use MODS format for rich cataloging
2. **MARC Conversion**: Convert MODS to MARC21
3. **Batch Import**: Use Koha's batch import tools

### Custom Repository

1. **Use JSON Format**: Modern API-friendly format
2. **Persistent IDs**: Reference by identifier, not file path
3. **Checksum Verification**: Validate integrity on import

## Best Practices

### Choosing Identifier Types

- **UUID**: Default choice, works everywhere
- **ARK**: Cultural heritage, museums, archives
- **Handle**: Academic institutions, research data

### Choosing Metadata Formats

- **Dublin Core**: Maximum compatibility, simple needs
- **MODS**: Rich bibliographic data, library systems
- **JSON**: Modern systems, APIs, web services
- **CSV**: Bulk operations, spreadsheet analysis

### Validation Strategy

- **Always validate** before final export
- **Fix issues** before archiving
- **Document exceptions** if validation fails but export is necessary

### Folder Organization

Remember: **Folders are for humans, not systems**

- Use folders for browsing convenience
- Never rely on folder names for metadata
- Always reference by persistent identifier
- Store folder structure separately if needed

## Troubleshooting

### Export Fails

**Issue**: Export returns error
**Solution**: 
1. Check project has completed archival workflow
2. Verify file exists and is accessible
3. Check export folder permissions

### Validation Fails

**Issue**: PDF validation shows issues
**Solution**:
1. Review specific issues listed
2. Re-process PDF if encrypted
3. Re-run OCR if no text layer
4. Add metadata if missing

### Identifier Not Found

**Issue**: Project has no identifier
**Solution**: Identifiers are auto-generated on first export

## Technical Architecture

### Database Schema

```sql
CREATE TABLE project_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    id_type TEXT NOT NULL,
    identifier TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, id_type)
);
```

### Export Manager Components

1. **PersistentIdentifier**: Generates and manages IDs
2. **MetadataExporter**: Converts to various formats
3. **FileValidator**: Checks archival compliance
4. **ExportManager**: Orchestrates export process

## Future Enhancements

Planned features:

1. **PDF/A Conversion**: Automatic conversion to PDF/A-1b
2. **BagIt Packaging**: Full BagIt spec compliance
3. **OAI-PMH Server**: Expose exports via OAI-PMH
4. **PREMIS Metadata**: Preservation metadata standard
5. **Automated Fixity**: Scheduled checksum verification
6. **Version Control**: Track changes to exported assets

## Conclusion

The Preservation Export System ensures your digitized assets are:

- **Findable**: Persistent identifiers enable discovery
- **Accessible**: Standard formats ensure compatibility
- **Interoperable**: Works with any repository system
- **Reusable**: Machine-readable metadata enables reuse

This is not just an export feature—it's a preservation pipeline designed to outlive the software that created it.

---

**For Support**: See Help & Guide in the application
**Version**: 1.0.0
**Last Updated**: January 2026
