import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Field } from '@shared/Field';
import { FormField, MappingProfile } from '@shared/Mapping';
import { sendMessage } from '../../utils/messaging';

interface MappingEditorProps {
  extractedFields: Field[];
  formFields: FormField[];
}

const MappingEditor: React.FC<MappingEditorProps> = ({ extractedFields, formFields }) => {
  const [mappingMode, setMappingMode] = useState(false);
  const [selectedExtractedField, setSelectedExtractedField] = useState<Field | null>(null);
  const [mappings, setMappings] = useState<Record<string, string[]>>({});
  const queryClient = useQueryClient();

  // Query for current mapping profile
  const { data: currentProfile } = useQuery({
    queryKey: ['mappingProfile'],
    queryFn: async () => {
      const response = await sendMessage({ type: 'GET_MAPPING_PROFILE' });
      return response.profile as MappingProfile | null;
    },
  });

  // Update mappings when profile changes
  useEffect(() => {
    if (currentProfile) {
      setMappings(currentProfile.selectors);
    }
  }, [currentProfile]);

  // Save mapping profile mutation
  const saveMappingMutation = useMutation({
    mutationFn: async (profile: MappingProfile) => {
      await sendMessage({ type: 'SAVE_MAPPING_PROFILE', profile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappingProfile'] });
    },
  });

  const handleFieldMapping = (extractedField: Field, formField: FormField) => {
    const fieldName = extractedField.canonical;
    const selector = formField.selector;
    
    setMappings(prev => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), selector]
    }));
    
    setMappingMode(false);
    setSelectedExtractedField(null);
  };

  const handleRemoveMapping = (fieldName: string, selector: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: prev[fieldName]?.filter(s => s !== selector) || []
    }));
  };

  const handleSaveProfile = () => {
    if (!currentProfile) return;
    
    const updatedProfile: MappingProfile = {
      ...currentProfile,
      selectors: mappings,
      updated: Date.now()
    };
    
    saveMappingMutation.mutate(updatedProfile);
  };

  const handleExportProfile = async () => {
    try {
      const response = await sendMessage({ type: 'EXPORT_MAPPING_PROFILES' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formpilot-mappings.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportProfile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as string;
        await sendMessage({ type: 'IMPORT_MAPPING_PROFILES', data });
        queryClient.invalidateQueries({ queryKey: ['mappingProfile'] });
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import mapping profile');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mapping-container">
      <div className="mapping-header">
        <h2>Field Mapping</h2>
        <div className="mapping-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setMappingMode(!mappingMode)}
          >
            {mappingMode ? 'Cancel Mapping' : 'Record Mapping'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveProfile}
            disabled={saveMappingMutation.isPending}
          >
            Save Profile
          </button>
        </div>
      </div>

      {mappingMode && (
        <div className="mapping-mode-info">
          <p>Click on an extracted field, then click on a form field to create a mapping.</p>
        </div>
      )}

      <div className="mapping-sections">
        <div className="mapping-section">
          <h3>Extracted Fields</h3>
          <div className="extracted-fields">
            {extractedFields.map(field => (
              <div
                key={field.canonical}
                className={`mapping-field-item ${
                  selectedExtractedField?.canonical === field.canonical ? 'selected' : ''
                }`}
                onClick={() => {
                  if (mappingMode) {
                    setSelectedExtractedField(field);
                  }
                }}
              >
                <span className="field-name">{field.canonical}</span>
                {field.chosen && (
                  <span className="field-value">{field.chosen.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mapping-section">
          <h3>Form Fields</h3>
          <div className="form-fields">
            {formFields.map((field, index) => (
              <div
                key={index}
                className="mapping-field-item"
                onClick={() => {
                  if (mappingMode && selectedExtractedField) {
                    handleFieldMapping(selectedExtractedField, field);
                  }
                }}
              >
                <span className="field-name">{field.label || field.placeholder || field.name || 'Unlabeled'}</span>
                <span className="field-selector">{field.selector}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mapping-section">
        <h3>Current Mappings</h3>
        <div className="current-mappings">
          {Object.entries(mappings).map(([fieldName, selectors]) => (
            <div key={fieldName} className="mapping-item">
              <span className="mapping-field">{fieldName}</span>
              <div className="mapping-selectors">
                {selectors.map((selector, index) => (
                  <div key={index} className="selector-item">
                    <span className="selector-text">{selector}</span>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleRemoveMapping(fieldName, selector)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mapping-section">
        <h3>Profile Management</h3>
        <div className="profile-actions">
          <button
            className="btn btn-secondary"
            onClick={handleExportProfile}
          >
            Export Profile
          </button>
          <label className="btn btn-secondary">
            Import Profile
            <input
              type="file"
              accept=".json"
              onChange={handleImportProfile}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default MappingEditor;