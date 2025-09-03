import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Edit2 } from 'lucide-react';
import { Field } from '@shared/types';
import clsx from 'clsx';

interface FieldListProps {
  fields: Field[];
  onSelectField: (field: Field) => void;
  selectedField: Field | null;
}

export function FieldList({ fields, onSelectField, selectedField }: FieldListProps) {
  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.92) {
      return <CheckCircle className="w-4 h-4 text-success-600" />;
    } else if (confidence >= 0.8) {
      return <AlertCircle className="w-4 h-4 text-warning-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-danger-600" />;
    }
  };

  const getValidationStatus = (field: Field) => {
    if (!field.validations || field.validations.length === 0) return null;
    
    const hasErrors = field.validations.some(v => !v.passed);
    if (hasErrors) {
      return (
        <span className="text-xs text-danger-600">
          {field.validations.filter(v => !v.passed).length} validation errors
        </span>
      );
    }
    return <span className="text-xs text-success-600">Valid</span>;
  };

  // Group fields by confidence level
  const readyFields = fields.filter(f => f.chosen && f.chosen.confidence >= 0.92);
  const reviewFields = fields.filter(f => f.chosen && f.chosen.confidence >= 0.8 && f.chosen.confidence < 0.92);
  const manualFields = fields.filter(f => !f.chosen || f.chosen.confidence < 0.8);

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search fields..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {readyFields.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Ready to Fill</h3>
          <div className="space-y-2">
            {readyFields.map((field, index) => (
              <FieldItem
                key={`${field.canonical}-${index}`}
                field={field}
                onSelect={() => onSelectField(field)}
                isSelected={selectedField === field}
              />
            ))}
          </div>
        </div>
      )}

      {reviewFields.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Needs Review</h3>
          <div className="space-y-2">
            {reviewFields.map((field, index) => (
              <FieldItem
                key={`${field.canonical}-${index}`}
                field={field}
                onSelect={() => onSelectField(field)}
                isSelected={selectedField === field}
              />
            ))}
          </div>
        </div>
      )}

      {manualFields.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Manual Entry</h3>
          <div className="space-y-2">
            {manualFields.map((field, index) => (
              <FieldItem
                key={`${field.canonical}-${index}`}
                field={field}
                onSelect={() => onSelectField(field)}
                isSelected={selectedField === field}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldItemProps {
  field: Field;
  onSelect: () => void;
  isSelected: boolean;
}

function FieldItem({ field, onSelect, isSelected }: FieldItemProps) {
  const confidence = field.chosen?.confidence || 0;
  
  return (
    <div
      className={clsx(
        'p-3 rounded-md border cursor-pointer transition-colors',
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getConfidenceIcon(confidence)}
            <span className="text-sm font-medium text-gray-900">
              {field.canonical.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          <div className="text-sm text-gray-600 truncate">
            {field.chosen?.value || field.candidates[0]?.value || 'No value'}
          </div>
          {field.validations && field.validations.length > 0 && (
            <div className="mt-1">
              {getValidationStatus(field)}
            </div>
          )}
        </div>
        <button
          className="ml-2 p-1 hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Handle edit
          }}
        >
          <Edit2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 0.92) {
    return <CheckCircle className="w-4 h-4 text-success-600" />;
  } else if (confidence >= 0.8) {
    return <AlertCircle className="w-4 h-4 text-warning-600" />;
  } else {
    return <XCircle className="w-4 h-4 text-danger-600" />;
  }
}

function getValidationStatus(field: Field) {
  if (!field.validations || field.validations.length === 0) return null;
  
  const hasErrors = field.validations.some(v => !v.passed);
  if (hasErrors) {
    return (
      <span className="text-xs text-danger-600">
        {field.validations.filter(v => !v.passed).length} validation errors
      </span>
    );
  }
  return <span className="text-xs text-success-600">Valid</span>;
}