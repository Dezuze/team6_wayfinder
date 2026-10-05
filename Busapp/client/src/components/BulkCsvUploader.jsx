import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, FileText, Check, AlertCircle, X, Loader } from 'lucide-react';
import { parseCSV, downloadCSV } from '../utils/csv';

export default function BulkCsvUploader({
  title = "Bulk CSV Import",
  templateFilename = "template.csv",
  templateContent = "",
  columns = [],
  onUpload,
  isSubmitting = false,
  entityName = "Records"
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    setParseError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const rows = parseCSV(text);
        if (!rows || rows.length === 0) {
          setParseError('No data rows found in the CSV file.');
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setParseError('Failed to parse CSV file: ' + err.message);
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParseError('Error reading file.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    processFile(droppedFile);
  };

  const handleClear = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedRows || parsedRows.length === 0 || isSubmitting) return;
    await onUpload(parsedRows);
    handleClear();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      backgroundColor: 'var(--bg-subtle, #f8fafc)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '12px',
      padding: '1.25rem'
    }}>
      {/* Header with Download Template */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {title}
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            Upload a CSV spreadsheet to import multiple {entityName.toLowerCase()} at once
          </p>
        </div>

        {templateContent && (
          <button
            type="button"
            onClick={() => downloadCSV(templateFilename, templateContent)}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Download CSV Template</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#7c3aed' : 'var(--border-color, #cbd5e1)'}`,
            backgroundColor: isDragOver ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Upload size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Click to select or drag and drop CSV file
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Standard comma-separated (.csv) format
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,text/csv"
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        /* File Info and Preview */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={18} color="#7c3aed" />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {parsedRows.length} valid {entityName.toLowerCase()} detected
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>

          {/* Table Preview */}
          {parsedRows.length > 0 && (
            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)'
            }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.45rem 0.65rem', color: 'var(--text-muted)' }}>#</th>
                    {columns.map(col => (
                      <th key={col.key} style={{ padding: '0.45rem 0.65rem', color: 'var(--text-secondary)' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.45rem 0.65rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      {columns.map(col => {
                        const val = row[col.key.toLowerCase().replace(/[^a-z0-9]/g, '')] || row[col.key] || '-';
                        return (
                          <td key={col.key} style={{ padding: '0.45rem 0.65rem', fontWeight: 500 }}>
                            {String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 5 && (
                <div style={{ padding: '0.4rem 0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
                  ...and {parsedRows.length - 5} more records
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || parsedRows.length === 0}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                opacity: isSubmitting || parsedRows.length === 0 ? 0.6 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader size={14} className="spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Import {parsedRows.length} {entityName}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Parse Error Alert */}
      {parseError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger, #ef4444)',
          fontSize: '0.78rem'
        }}>
          <AlertCircle size={15} />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  );
}
