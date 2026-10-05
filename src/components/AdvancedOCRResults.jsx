import {
    FileText,
    Table,
    CheckSquare,
    Edit3,
    RotateCw,
    FileSignature,
    Stamp,
    AlignLeft,
    AlignRight
} from 'lucide-react';

const AdvancedOCRResults = ({ results }) => {
    if (!results) return null;

    const {
        statistics = {},
        orientation = {},
        page_structure = {},
        tables_found = 0,
        forms_found = {}
    } = results;

    return (
        <div className="advanced-ocr-results">
            <div className="results-header">
                <FileText size={24} />
                <h3>Advanced OCR Analysis</h3>
            </div>

            <div className="results-grid">
                {/* Orientation Correction */}
                {orientation.corrected && (
                    <div className="result-card highlight">
                        <div className="card-icon">
                            <RotateCw size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Orientation Corrected</h4>
                            <p>Rotated {orientation.rotation_angle}°</p>
                        </div>
                    </div>
                )}

                {/* Total Words */}
                <div className="result-card">
                    <div className="card-icon">
                        <FileText size={20} />
                    </div>
                    <div className="card-content">
                        <h4>Total Words</h4>
                        <p className="stat-value">{statistics.total_words || 0}</p>
                    </div>
                </div>

                {/* Tables Found */}
                {tables_found > 0 && (
                    <div className="result-card success">
                        <div className="card-icon">
                            <Table size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Tables Detected</h4>
                            <p className="stat-value">{tables_found}</p>
                        </div>
                    </div>
                )}

                {/* Checkboxes */}
                {forms_found.checkboxes > 0 && (
                    <div className="result-card success">
                        <div className="card-icon">
                            <CheckSquare size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Checkboxes</h4>
                            <p className="stat-value">{forms_found.checkboxes}</p>
                        </div>
                    </div>
                )}

                {/* Text Fields */}
                {forms_found.text_fields > 0 && (
                    <div className="result-card success">
                        <div className="card-icon">
                            <Edit3 size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Text Fields</h4>
                            <p className="stat-value">{forms_found.text_fields}</p>
                        </div>
                    </div>
                )}

                {/* Stamps */}
                {statistics.stamps_found > 0 && (
                    <div className="result-card info">
                        <div className="card-icon">
                            <Stamp size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Stamps/Watermarks</h4>
                            <p className="stat-value">{statistics.stamps_found}</p>
                        </div>
                    </div>
                )}

                {/* Signatures */}
                {statistics.signatures_found > 0 && (
                    <div className="result-card info">
                        <div className="card-icon">
                            <FileSignature size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Signatures</h4>
                            <p className="stat-value">{statistics.signatures_found}</p>
                        </div>
                    </div>
                )}

                {/* Header Detected */}
                {page_structure.has_header && (
                    <div className="result-card">
                        <div className="card-icon">
                            <AlignLeft size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Header</h4>
                            <p>Detected</p>
                        </div>
                    </div>
                )}

                {/* Footer Detected */}
                {page_structure.has_footer && (
                    <div className="result-card">
                        <div className="card-icon">
                            <AlignRight size={20} />
                        </div>
                        <div className="card-content">
                            <h4>Footer</h4>
                            <p>Detected</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="results-summary">
                <h4>Document Structure Analysis Complete</h4>
                <p>
                    Advanced OCR has analyzed the document structure, detected {tables_found} table(s),
                    {forms_found.checkboxes > 0 && ` ${forms_found.checkboxes} checkbox(es),`}
                    {forms_found.text_fields > 0 && ` ${forms_found.text_fields} text field(s),`}
                    {statistics.stamps_found > 0 && ` ${statistics.stamps_found} stamp(s),`}
                    {statistics.signatures_found > 0 && ` ${statistics.signatures_found} signature(s),`}
                    {orientation.corrected && ` corrected page orientation,`}
                    and extracted {statistics.total_words || 0} words.
                </p>
            </div>
        </div>
    );
};

export default AdvancedOCRResults;
