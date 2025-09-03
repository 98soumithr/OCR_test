/**
 * Field List Component - Shows extracted fields with confidence indicators
 */

import React, { useState } from 'react';
import { Field, Candidate } from '@shared/types';
import { CONFIDENCE_THRESHOLDS } from '@shared/constants';
import { useFormPilotStore } from '../stores/formPilotStore';
import { Button } from './ui/Button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Edit, 
  Eye, 
  Search,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';

interface FieldListProps {
  fields: Field[];
  readyToFill: Field[];
  needsReview: Field[];
}

export const FieldList: React.FC<FieldListProps> = ({ 
  fields, 
  readyToFill, 
  needsReview 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['ready', 'review'])
  );
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const filteredReadyFields = readyToFill.filter(field =>
    field.canonical.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.chosen?.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReviewFields = needsReview.filter(field =>
    field.canonical.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.chosen?.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (fields.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <div className="text-lg font-medium">No fields extracted</div>
          <div className="text-sm">Upload a PDF to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Field Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Ready to Fill Section */}
        <FieldSection
          title="Ready to Fill"
          count={filteredReadyFields.length}
          icon={<CheckCircle className="w-4 h-4 text-success-600" />}
          expanded={expandedSections.has('ready')}
          onToggle={() => toggleSection('ready')}
        >
          {filteredReadyFields.map(field => (
            <FieldCard key={field.canonical} field={field} status="ready" />
          ))}
        </FieldSection>

        {/* Needs Review Section */}
        <FieldSection
          title="Needs Review"
          count={filteredReviewFields.length}
          icon={<AlertTriangle className="w-4 h-4 text-warning-600" />}
          expanded={expandedSections.has('review')}
          onToggle={() => toggleSection('review')}
        >
          {filteredReviewFields.map(field => (
            <FieldCard key={field.canonical} field={field} status="review" />
          ))}
        </FieldSection>

        {/* Low Confidence Fields */}
        {fields.filter(f => f.chosen && f.chosen.confidence < CONFIDENCE_THRESHOLDS.MEDIUM).length > 0 && (
          <FieldSection
            title="Low Confidence"
            count={fields.filter(f => f.chosen && f.chosen.confidence < CONFIDENCE_THRESHOLDS.MEDIUM).length}
            icon={<Eye className="w-4 h-4 text-gray-500" />}
            expanded={expandedSections.has('low')}
            onToggle={() => toggleSection('low')}
          >
            {fields
              .filter(f => f.chosen && f.chosen.confidence < CONFIDENCE_THRESHOLDS.MEDIUM)
              .map(field => (
                <FieldCard key={field.canonical} field={field} status="low" />
              ))}
          </FieldSection>
        )}
      </div>
    </div>
  );
};

interface FieldSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FieldSection: React.FC<FieldSectionProps> = ({
  title,
  count,
  icon,
  expanded,
  onToggle,
  children
}) => {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-sm text-gray-500">({count})</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {expanded && (
        <div className="divide-y divide-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

interface FieldCardProps {
  field: Field;
  status: 'ready' | 'review' | 'low';
}

const FieldCard: React.FC<FieldCardProps> = ({ field, status }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.chosen?.value || '');
  const { updateFieldValue, approveField, setSelectedFields } = useFormPilotStore();

  const handleSave = () => {
    updateFieldValue(field.canonical, editValue);
    setIsEditing(false);
  };

  const handleApprove = () => {
    approveField(field.canonical);
  };

  const handlePreview = () => {
    setSelectedFields([field.canonical]);
    // Switch to preview tab would be handled by parent
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
      return <span className="formpilot-badge formpilot-badge-high">High</span>;
    } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      return <span className="formpilot-badge formpilot-badge-medium">Medium</span>;
    } else {
      return <span className="formpilot-badge formpilot-badge-low">Low</span>;
    }
  };

  const formatFieldName = (canonical: string) => {
    return canonical.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Field Name */}
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-medium text-gray-900">
              {formatFieldName(field.canonical)}
            </h4>
            {field.chosen && getConfidenceBadge(field.chosen.confidence)}
          </div>

          {/* Field Value */}
          <div className="mb-3">
            {isEditing ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 formpilot-input text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                  {field.chosen?.value || 'No value'}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Validation Results */}
          {field.validations.length > 0 && (
            <div className="mb-3">
              {field.validations.map((validation, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'text-xs px-2 py-1 rounded',
                    validation.passed
                      ? 'bg-success-100 text-success-700'
                      : 'bg-error-100 text-error-700'
                  )}
                >
                  {validation.passed ? '✓' : '✗'} {validation.rule}
                  {validation.message && `: ${validation.message}`}
                </div>
              ))}
            </div>
          )}

          {/* Alternative Candidates */}
          {field.candidates.length > 1 && (
            <div className="text-xs text-gray-500">
              +{field.candidates.length - 1} alternative{field.candidates.length > 2 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-1 ml-4">
          <button
            onClick={handlePreview}
            className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
            title="Preview in PDF"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {status === 'review' && (
            <Button
              size="sm"
              variant="success"
              onClick={handleApprove}
              className="text-xs"
            >
              Approve
            </Button>
          )}
        </div>
      </div>

      {/* Source Information */}
      {field.chosen && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <div>Page {field.chosen.page}</div>
            {field.chosen.sourceText && (
              <div className="mt-1 italic">"{field.chosen.sourceText}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};