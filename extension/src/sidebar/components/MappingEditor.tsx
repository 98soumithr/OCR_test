/**
 * Mapping Editor Component - Manage site-specific field mappings
 */

import React, { useState, useEffect } from 'react';
import { DOMInput, Field, MappingProfile } from '@shared/types';
import { useFormPilotStore } from '../stores/formPilotStore';
import { Button } from './ui/Button';
import { 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  Target,
  Link,
  AlertTriangle
} from 'lucide-react';

interface MappingEditorProps {
  domInputs: DOMInput[];
  fields: Field[];
}

export const MappingEditor: React.FC<MappingEditorProps> = ({ domInputs, fields }) => {
  const { 
    currentMappingProfile, 
    setCurrentMappingProfile,
    isRecordingMapping,
    setIsRecordingMapping,
    currentUrl
  } = useFormPilotStore();

  const [mappings, setMappings] = useState<Record<string, string[]>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize mappings from current profile
  useEffect(() => {
    if (currentMappingProfile) {
      setMappings(currentMappingProfile.selectors);
    } else {
      setMappings({});
    }
    setHasUnsavedChanges(false);
  }, [currentMappingProfile]);

  const handleAddMapping = (canonical: string, selector: string) => {
    setMappings(prev => ({
      ...prev,
      [canonical]: [...(prev[canonical] || []), selector]
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveMapping = (canonical: string, selector: string) => {
    setMappings(prev => ({
      ...prev,
      [canonical]: (prev[canonical] || []).filter(s => s !== selector)
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUrl) return;

    try {
      const url = new URL(currentUrl);
      const profile: MappingProfile = {
        version: 1,
        site: `${url.protocol}//${url.host}`,
        path: url.pathname,
        selectors: mappings,
        lastUpdated: new Date().toISOString(),
        confidence: calculateProfileConfidence()
      };

      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_MAPPING_PROFILE',
          profile
        }, (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      setCurrentMappingProfile(profile);
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('FormPilot: Error saving mapping profile:', error);
    }
  };

  const handleExportProfile = () => {
    if (!currentMappingProfile) return;

    const yaml = generateYAML(currentMappingProfile);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `formpilot-mapping-${new URL(currentMappingProfile.site).host}.yaml`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImportProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const yamlContent = e.target?.result as string;
        const profile = parseYAML(yamlContent);
        setCurrentMappingProfile(profile);
      } catch (error) {
        console.error('FormPilot: Error importing profile:', error);
      }
    };
    reader.readAsText(file);
  };

  const calculateProfileConfidence = (): number => {
    const totalMappings = Object.keys(mappings).length;
    const validMappings = Object.values(mappings).filter(selectors => 
      selectors.some(selector => domInputs.some(input => input.selector === selector))
    ).length;
    
    return totalMappings > 0 ? validMappings / totalMappings : 0;
  };

  const startRecordingMode = () => {
    setIsRecordingMapping(true);
    // Notify content script to enter recording mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_RECORDING_MODE' });
      }
    });
  };

  const stopRecordingMode = () => {
    setIsRecordingMapping(false);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_RECORDING_MODE' });
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Field Mapping</h2>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportProfile}
              disabled={!currentMappingProfile}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <label className="formpilot-button formpilot-button-secondary cursor-pointer inline-flex items-center text-sm">
              <Upload className="w-4 h-4 mr-1" />
              Import
              <input
                type="file"
                accept=".yaml,.yml"
                onChange={handleImportProfile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Current Site Info */}
        {currentUrl && (
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Link className="w-4 h-4" />
              <span>{new URL(currentUrl).host}</span>
            </div>
            {currentMappingProfile && (
              <div className="mt-1 text-xs text-success-600">
                ✓ Profile loaded ({Math.round(calculateProfileConfidence() * 100)}% confidence)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recording Mode Toggle */}
      <div className="p-4 bg-yellow-50 border-b border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {isRecordingMapping ? 'Recording Mode Active' : 'Record Mapping Mode'}
            </span>
          </div>
          <Button
            size="sm"
            variant={isRecordingMapping ? 'danger' : 'secondary'}
            onClick={isRecordingMapping ? stopRecordingMode : startRecordingMode}
          >
            {isRecordingMapping ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
        {isRecordingMapping && (
          <div className="mt-2 text-xs text-yellow-700">
            Click on a form input, then select a field below to create a mapping
          </div>
        )}
      </div>

      {/* Mappings List */}
      <div className="flex-1 overflow-y-auto">
        {fields.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg font-medium">No fields available</div>
              <div className="text-sm">Upload a PDF to create mappings</div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {fields.map(field => (
              <MappingRow
                key={field.canonical}
                field={field}
                domInputs={domInputs}
                currentMappings={mappings[field.canonical] || []}
                onAddMapping={(selector) => handleAddMapping(field.canonical, selector)}
                onRemoveMapping={(selector) => handleRemoveMapping(field.canonical, selector)}
                isRecording={isRecordingMapping}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      {hasUnsavedChanges && (
        <div className="p-4 bg-white border-t border-gray-200">
          <Button
            onClick={handleSaveProfile}
            className="w-full formpilot-button-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Mapping Profile
          </Button>
        </div>
      )}
    </div>
  );
};

interface MappingRowProps {
  field: Field;
  domInputs: DOMInput[];
  currentMappings: string[];
  onAddMapping: (selector: string) => void;
  onRemoveMapping: (selector: string) => void;
  isRecording: boolean;
}

const MappingRow: React.FC<MappingRowProps> = ({
  field,
  domInputs,
  currentMappings,
  onAddMapping,
  onRemoveMapping,
  isRecording
}) => {
  const [showInputs, setShowInputs] = useState(false);

  const formatFieldName = (canonical: string) => {
    return canonical.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getMatchingInputs = () => {
    return domInputs.filter(input => 
      !currentMappings.includes(input.selector)
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">
            {formatFieldName(field.canonical)}
          </h4>
          {field.chosen && (
            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              {field.chosen.value}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowInputs(!showInputs)}
        >
          {showInputs ? 'Hide' : 'Map'} Inputs
        </Button>
      </div>

      {/* Current Mappings */}
      {currentMappings.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Current mappings:</div>
          <div className="space-y-1">
            {currentMappings.map(selector => {
              const input = domInputs.find(inp => inp.selector === selector);
              const isValid = !!input;
              
              return (
                <div
                  key={selector}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    isValid ? 'bg-success-50 border border-success-200' : 'bg-error-50 border border-error-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {isValid ? (
                      <span className="text-success-700">✓</span>
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-error-600" />
                    )}
                    <span className={`font-mono ${isValid ? 'text-success-700' : 'text-error-700'}`}>
                      {selector}
                    </span>
                    {input && (
                      <span className="text-gray-600">({input.label})</span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveMapping(selector)}
                    className="text-gray-400 hover:text-error-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Inputs */}
      {showInputs && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Available inputs:</div>
          {getMatchingInputs().map(input => (
            <div
              key={input.selector}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {input.label}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {input.selector}
                </div>
                <div className="text-xs text-gray-400">
                  Type: {input.type}
                  {input.placeholder && ` • Placeholder: "${input.placeholder}"`}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onAddMapping(input.selector)}
                className="ml-2"
              >
                Map
              </Button>
            </div>
          ))}
          
          {getMatchingInputs().length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No available inputs to map
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper functions for YAML import/export
function generateYAML(profile: MappingProfile): string {
  const lines = [
    `version: ${profile.version}`,
    `site: "${profile.site}"`,
    profile.path ? `path: "${profile.path}"` : null,
    `selectors:`
  ].filter(Boolean);

  for (const [canonical, selectors] of Object.entries(profile.selectors)) {
    lines.push(`  ${canonical}:`);
    for (const selector of selectors) {
      lines.push(`    - "${selector}"`);
    }
  }

  return lines.join('\n');
}

function parseYAML(yamlContent: string): MappingProfile {
  // This is a simplified YAML parser for the specific format
  // In production, you'd use a proper YAML library
  const lines = yamlContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  const profile: Partial<MappingProfile> = {
    selectors: {}
  };
  
  let currentField: string | null = null;
  
  for (const line of lines) {
    if (line.startsWith('version:')) {
      profile.version = parseInt(line.split(':')[1].trim());
    } else if (line.startsWith('site:')) {
      profile.site = line.split(':')[1].trim().replace(/"/g, '');
    } else if (line.startsWith('path:')) {
      profile.path = line.split(':')[1].trim().replace(/"/g, '');
    } else if (line.startsWith('selectors:')) {
      // Start of selectors section
      continue;
    } else if (line.match(/^\s*\w+:$/)) {
      // Field name
      currentField = line.replace(':', '').trim();
      profile.selectors![currentField] = [];
    } else if (line.startsWith('- ') && currentField) {
      // Selector for current field
      const selector = line.substring(2).trim().replace(/"/g, '');
      profile.selectors![currentField].push(selector);
    }
  }
  
  profile.lastUpdated = new Date().toISOString();
  
  return profile as MappingProfile;
}