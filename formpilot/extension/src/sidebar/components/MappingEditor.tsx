import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Field, FormInput, MappingProfile } from '@shared/types';

interface MappingEditorProps {
  mapping: MappingProfile | null;
  fields: Field[];
  inputs: FormInput[];
  onSave: (mapping: MappingProfile) => void;
  onScan: () => void;
  isScanning?: boolean;
}

export function MappingEditor({ 
  mapping, 
  fields, 
  inputs, 
  onSave, 
  onScan,
  isScanning 
}: MappingEditorProps) {
  const [editedMapping, setEditedMapping] = useState<MappingProfile | null>(mapping);
  const [recordMode, setRecordMode] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  useEffect(() => {
    setEditedMapping(mapping);
  }, [mapping]);

  const handleAddMapping = (field: string, selector: string) => {
    if (!editedMapping) {
      setEditedMapping({
        version: 1,
        site: window.location.href,
        selectors: { [field]: [selector] },
        lastUpdated: new Date().toISOString()
      });
    } else {
      const updated = { ...editedMapping };
      if (!updated.selectors[field]) {
        updated.selectors[field] = [];
      }
      if (!updated.selectors[field].includes(selector)) {
        updated.selectors[field].push(selector);
      }
      setEditedMapping(updated);
    }
  };

  const handleRemoveMapping = (field: string, selector: string) => {
    if (!editedMapping) return;
    
    const updated = { ...editedMapping };
    if (updated.selectors[field]) {
      updated.selectors[field] = updated.selectors[field].filter(s => s !== selector);
      if (updated.selectors[field].length === 0) {
        delete updated.selectors[field];
      }
    }
    setEditedMapping(updated);
  };

  const handleSave = () => {
    if (editedMapping) {
      onSave(editedMapping);
    }
  };

  const handleRecordClick = (input: FormInput) => {
    if (recordMode && selectedField) {
      handleAddMapping(selectedField, input.selector);
      setSelectedField(null);
      setRecordMode(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onScan}
            disabled={isScanning}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`inline-block w-4 h-4 mr-1 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Page
          </button>
          <button
            onClick={() => setRecordMode(!recordMode)}
            className={`px-3 py-1.5 text-sm rounded-md ${
              recordMode 
                ? 'bg-danger-100 text-danger-700 hover:bg-danger-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {recordMode ? 'Stop Recording' : 'Record Mapping'}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!editedMapping}
          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="inline-block w-4 h-4 mr-1" />
          Save Mapping
        </button>
      </div>

      {/* Record Mode Instructions */}
      {recordMode && (
        <div className="p-3 bg-warning-50 border border-warning-200 rounded-md">
          <p className="text-sm text-warning-800">
            Recording mode active. Select a field below, then click on a form input on the page to create a mapping.
          </p>
        </div>
      )}

      {/* Existing Mappings */}
      {editedMapping && Object.keys(editedMapping.selectors).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Mappings</h3>
          <div className="space-y-2">
            {Object.entries(editedMapping.selectors).map(([field, selectors]) => (
              <div key={field} className="p-2 bg-white border border-gray-200 rounded-md">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="space-y-1">
                  {selectors.map((selector, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <code className="text-gray-600 bg-gray-50 px-1 py-0.5 rounded">
                        {selector}
                      </code>
                      <button
                        onClick={() => handleRemoveMapping(field, selector)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Fields */}
      {recordMode && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Field to Map</h3>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((field, index) => (
              <button
                key={`${field.canonical}-${index}`}
                onClick={() => setSelectedField(field.canonical)}
                className={`p-2 text-sm text-left rounded-md border transition-colors ${
                  selectedField === field.canonical
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {field.canonical.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detected Inputs */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Detected Form Inputs ({inputs.length})
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {inputs.map((input, index) => (
            <div
              key={index}
              className={`p-2 text-sm bg-white border border-gray-200 rounded-md hover:border-gray-300 ${
                recordMode && selectedField ? 'cursor-pointer' : ''
              }`}
              onClick={() => handleRecordClick(input)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{input.label || input.name || input.id || 'Unnamed'}</span>
                <span className="text-xs text-gray-500">{input.type}</span>
              </div>
              <code className="text-xs text-gray-600">{input.selector}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}