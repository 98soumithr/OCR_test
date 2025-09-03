import React, { useState } from 'react';
import { Field, Candidate } from '@shared/Field';

interface FieldListProps {
  fields: Field[];
  onFieldSelect: (field: Field) => void;
  onFieldUpdate: (field: Field) => void;
}

const FieldList: React.FC<FieldListProps> = ({ fields, onFieldSelect, onFieldUpdate }) => {
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFields = fields.filter(field =>
    field.canonical.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.candidates.some(candidate =>
      candidate.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleFieldClick = (field: Field) => {
    setSelectedField(field);
    onFieldSelect(field);
  };

  const handleCandidateSelect = (field: Field, candidate: Candidate) => {
    const updatedField = { ...field, chosen: candidate };
    onFieldUpdate(updatedField);
  };

  const handleValueEdit = (field: Field, newValue: string) => {
    const updatedCandidate = { ...field.chosen!, value: newValue };
    const updatedField = { ...field, chosen: updatedCandidate };
    onFieldUpdate(updatedField);
  };

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (fields.length === 0) {
    return (
      <div className="field-list">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-text">No fields extracted yet</div>
          <div className="empty-subtext">Upload a PDF to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="field-list">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="fields-section">
        <h3>Ready to Fill ({fields.filter(f => f.chosen && f.chosen.confidence >= 0.8).length})</h3>
        {filteredFields
          .filter(field => field.chosen && field.chosen.confidence >= 0.8)
          .map(field => (
            <FieldItem
              key={field.canonical}
              field={field}
              isSelected={selectedField?.canonical === field.canonical}
              onClick={() => handleFieldClick(field)}
              onCandidateSelect={(candidate) => handleCandidateSelect(field, candidate)}
              onValueEdit={(newValue) => handleValueEdit(field, newValue)}
            />
          ))}
      </div>

      <div className="fields-section">
        <h3>Needs Review ({fields.filter(f => !f.chosen || f.chosen.confidence < 0.8).length})</h3>
        {filteredFields
          .filter(field => !field.chosen || field.chosen.confidence < 0.8)
          .map(field => (
            <FieldItem
              key={field.canonical}
              field={field}
              isSelected={selectedField?.canonical === field.canonical}
              onClick={() => handleFieldClick(field)}
              onCandidateSelect={(candidate) => handleCandidateSelect(field, candidate)}
              onValueEdit={(newValue) => handleValueEdit(field, newValue)}
            />
          ))}
      </div>
    </div>
  );
};

interface FieldItemProps {
  field: Field;
  isSelected: boolean;
  onClick: () => void;
  onCandidateSelect: (candidate: Candidate) => void;
  onValueEdit: (newValue: string) => void;
}

const FieldItem: React.FC<FieldItemProps> = ({
  field,
  isSelected,
  onClick,
  onCandidateSelect,
  onValueEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.chosen?.value || '');

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleEditSave = () => {
    onValueEdit(editValue);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(field.chosen?.value || '');
    setIsEditing(false);
  };

  return (
    <div className={`field-item ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="field-header">
        <span className="field-name">{field.canonical.replace(/_/g, ' ')}</span>
        {field.chosen && (
          <span className={`field-confidence ${getConfidenceClass(field.chosen.confidence)}`}>
            {getConfidenceLabel(field.chosen.confidence)}
          </span>
        )}
      </div>

      {field.chosen ? (
        <div className="field-value">
          {isEditing ? (
            <div className="edit-container">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="edit-input"
                autoFocus
              />
              <div className="edit-actions">
                <button className="btn btn-small btn-primary" onClick={handleEditSave}>
                  Save
                </button>
                <button className="btn btn-small btn-secondary" onClick={handleEditCancel}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="value-display">
              <span className="value-text">{field.chosen.value}</span>
              <button
                className="btn btn-small btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="field-candidates">
          {field.candidates.map((candidate, index) => (
            <div key={index} className="candidate-item">
              <span className="candidate-value">{candidate.value}</span>
              <span className="candidate-confidence">
                {Math.round(candidate.confidence * 100)}%
              </span>
              <div className="candidate-actions">
                <button
                  className="btn btn-small btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCandidateSelect(candidate);
                  }}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {field.validations.length > 0 && (
        <div className="field-validations">
          {field.validations.map((validation, index) => (
            <div
              key={index}
              className={`validation-item ${validation.passed ? 'passed' : 'failed'}`}
            >
              <span className="validation-icon">
                {validation.passed ? '✓' : '✗'}
              </span>
              <span className="validation-text">
                {validation.rule}: {validation.message || 'OK'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FieldList;