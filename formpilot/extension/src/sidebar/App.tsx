import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, ChevronRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ExtractedData, Field, FormInput, MappingProfile } from '@shared/types';
import { PDFUploader } from './components/PDFUploader';
import { FieldList } from './components/FieldList';
import { PDFPreview } from './components/PDFPreview';
import { MappingEditor } from './components/MappingEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { useExtraction } from './hooks/useExtraction';
import { usePageScanner } from './hooks/usePageScanner';
import { useFormFiller } from './hooks/useFormFiller';

type TabType = 'extract' | 'fields' | 'mapping' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('extract');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [scannedInputs, setScannedInputs] = useState<FormInput[]>([]);
  const [currentMapping, setCurrentMapping] = useState<MappingProfile | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  
  const { extractPDF, isExtracting } = useExtraction();
  const { scanPage, isScanning } = usePageScanner();
  const { fillForm, isFilling } = useFormFiller();

  useEffect(() => {
    // Listen for messages from background
    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'SIDEBAR_PDF_EXTRACTED':
          setExtractedData(message.payload);
          setActiveTab('fields');
          break;
        case 'SIDEBAR_PAGE_SCANNED':
          setScannedInputs(message.payload.inputs);
          break;
        case 'SIDEBAR_MAPPING_UPDATED':
          // Reload mapping
          loadCurrentMapping();
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Initial scan
    handleScanPage();
    loadCurrentMapping();

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const data = await extractPDF(file);
    if (data) {
      setExtractedData(data);
      setActiveTab('fields');
    }
  };

  const handleScanPage = async () => {
    const inputs = await scanPage();
    if (inputs) {
      setScannedInputs(inputs);
    }
  };

  const handleFillForm = async () => {
    if (!extractedData || !currentMapping) return;
    
    await fillForm(extractedData.fields, currentMapping.selectors);
  };

  const loadCurrentMapping = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_MAPPING',
          payload: { url: tab.url }
        });
        
        if (response.success && response.data) {
          setCurrentMapping(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to load mapping:', error);
    }
  };

  const handleSaveMapping = async (mapping: MappingProfile) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        await chrome.runtime.sendMessage({
          type: 'SAVE_MAPPING',
          payload: { url: tab.url, mapping }
        });
        setCurrentMapping(mapping);
      }
    } catch (error) {
      console.error('Failed to save mapping:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">FormPilot</h1>
          <div className="flex items-center gap-2">
            {extractedData && (
              <span className="text-sm text-gray-500">
                {extractedData.fields.length} fields extracted
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('extract')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'extract'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Upload className="inline-block w-4 h-4 mr-1" />
          Extract
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'fields'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
          disabled={!extractedData}
        >
          <FileText className="inline-block w-4 h-4 mr-1" />
          Fields
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'mapping'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <ChevronRight className="inline-block w-4 h-4 mr-1" />
          Mapping
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Settings className="inline-block w-4 h-4 mr-1" />
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'extract' && (
          <div className="p-4">
            <PDFUploader onUpload={handleFileUpload} isLoading={isExtracting} />
          </div>
        )}

        {activeTab === 'fields' && extractedData && (
          <div className="flex h-full">
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
              <FieldList
                fields={extractedData.fields}
                onSelectField={setSelectedField}
                selectedField={selectedField}
              />
            </div>
            <div className="w-1/2 overflow-y-auto bg-gray-100">
              {selectedField && (
                <PDFPreview
                  field={selectedField}
                  pageNumber={selectedField.chosen?.page || 0}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'mapping' && (
          <div className="p-4">
            <MappingEditor
              mapping={currentMapping}
              fields={extractedData?.fields || []}
              inputs={scannedInputs}
              onSave={handleSaveMapping}
              onScan={handleScanPage}
              isScanning={isScanning}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4">
            <SettingsPanel />
          </div>
        )}
      </div>

      {/* Action Bar */}
      {extractedData && activeTab === 'fields' && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success-600" />
              <span className="text-gray-600">
                {extractedData.fields.filter(f => f.chosen && f.chosen.confidence >= 0.92).length} ready
              </span>
              <AlertCircle className="w-4 h-4 text-warning-600 ml-2" />
              <span className="text-gray-600">
                {extractedData.fields.filter(f => f.chosen && f.chosen.confidence >= 0.8 && f.chosen.confidence < 0.92).length} review
              </span>
              <XCircle className="w-4 h-4 text-danger-600 ml-2" />
              <span className="text-gray-600">
                {extractedData.fields.filter(f => !f.chosen || f.chosen.confidence < 0.8).length} manual
              </span>
            </div>
            <button
              onClick={handleFillForm}
              disabled={isFilling || !currentMapping}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFilling ? 'Filling...' : 'Fill Page'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;