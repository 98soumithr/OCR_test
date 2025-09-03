import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Field, ParseResponse } from '@shared/Field';
import { FormField, FillResult } from '@shared/Mapping';
import PDFUpload from './components/PDFUpload';
import FieldList from './components/FieldList';
import PDFPreview from './components/PDFPreview';
import MappingEditor from './components/MappingEditor';
import Settings from './components/Settings';
import { sendMessage } from '../utils/messaging';

type Tab = 'upload' | 'fields' | 'mapping' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [extractedFields, setExtractedFields] = useState<Field[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fillResults, setFillResults] = useState<FillResult[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const queryClient = useQueryClient();

  // Query for form fields on current page
  const { data: pageFields } = useQuery({
    queryKey: ['formFields'],
    queryFn: async () => {
      const response = await sendMessage({ type: 'SCAN_PAGE' });
      return response.fields as FormField[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Update form fields when query data changes
  useEffect(() => {
    if (pageFields) {
      setFormFields(pageFields);
    }
  }, [pageFields]);

  // Handle PDF upload and processing
  const handlePDFUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ParseResponse = await response.json();
      setExtractedFields(result.fields);
      setActiveTab('fields');
    } catch (error) {
      console.error('PDF processing failed:', error);
      alert('Failed to process PDF. Please try again.');
    }
  };

  // Handle field fill
  const handleFillFields = async (fields: Field[]) => {
    try {
      const response = await sendMessage({
        type: 'FILL_FIELDS',
        fields: fields,
      });

      setFillResults(response.results);
      
      // Refresh form fields to see updated values
      queryClient.invalidateQueries({ queryKey: ['formFields'] });
    } catch (error) {
      console.error('Form filling failed:', error);
      alert('Failed to fill form fields. Please try again.');
    }
  };

  // Handle field selection for preview
  const handleFieldSelect = (field: Field) => {
    setSelectedField(field);
  };

  // Clear all badges and results
  const handleClearResults = async () => {
    try {
      await sendMessage({ type: 'CLEAR_BADGES' });
      setFillResults([]);
      setSelectedField(null);
    } catch (error) {
      console.error('Failed to clear results:', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FormPilot</h1>
        <nav className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
          <button
            className={`tab-button ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
            disabled={extractedFields.length === 0}
          >
            Fields ({extractedFields.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'mapping' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapping')}
          >
            Mapping
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'upload' && (
          <PDFUpload onUpload={handlePDFUpload} />
        )}

        {activeTab === 'fields' && (
          <div className="fields-container">
            <div className="fields-panel">
              <div className="panel-header">
                <h2>Extracted Fields</h2>
                <div className="panel-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleFillFields(extractedFields)}
                    disabled={extractedFields.length === 0}
                  >
                    Fill Page
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleClearResults}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <FieldList
                fields={extractedFields}
                onFieldSelect={handleFieldSelect}
                onFieldUpdate={(updatedField) => {
                  setExtractedFields(prev =>
                    prev.map(f => f.canonical === updatedField.canonical ? updatedField : f)
                  );
                }}
              />
            </div>
            
            <div className="preview-panel">
              <PDFPreview
                selectedField={selectedField}
                fields={extractedFields}
              />
            </div>
          </div>
        )}

        {activeTab === 'mapping' && (
          <MappingEditor
            extractedFields={extractedFields}
            formFields={formFields}
          />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}
      </main>

      {fillResults.length > 0 && (
        <div className="fill-results">
          <h3>Fill Results</h3>
          <div className="results-list">
            {fillResults.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                <span className="result-field">{result.field}</span>
                <span className="result-value">{result.value}</span>
                {result.success ? (
                  <span className="result-status">✓</span>
                ) : (
                  <span className="result-status error">✗</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;