/**
 * Main Sidebar Application Component
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileUpload } from './FileUpload';
import { FieldList } from './FieldList';
import { PDFPreview } from './PDFPreview';
import { MappingEditor } from './MappingEditor';
import { Settings } from './Settings';
import { Field, ParseResult, DOMInput } from '@shared/types';
import { useFormPilotStore } from '../stores/formPilotStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Button } from './ui/Button';
import { FileText, Settings as SettingsIcon, Map, Upload } from 'lucide-react';

export const SidebarApp: React.FC = () => {
  const {
    currentDocument,
    parseResult,
    domInputs,
    selectedFields,
    setCurrentDocument,
    setParseResult,
    setDomInputs,
    scanCurrentPage,
    fillPage
  } = useFormPilotStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'fields' | 'preview' | 'mapping' | 'settings'>('upload');

  // Scan page on mount
  useEffect(() => {
    scanCurrentPage();
  }, [scanCurrentPage]);

  // Auto-switch to fields tab when document is processed
  useEffect(() => {
    if (parseResult && activeTab === 'upload') {
      setActiveTab('fields');
    }
  }, [parseResult, activeTab]);

  const handleFileUpload = async (result: ParseResult, documentId: string) => {
    setCurrentDocument(documentId);
    setParseResult(result);
    console.log('FormPilot: Document processed:', result);
  };

  const handleFillPage = async () => {
    if (!parseResult || !domInputs.length) {
      return;
    }

    try {
      await fillPage();
    } catch (error) {
      console.error('FormPilot: Error filling page:', error);
    }
  };

  const readyToFillFields = parseResult?.fields.filter(
    field => field.chosen && field.chosen.confidence >= 0.8
  ) || [];

  const needsReviewFields = parseResult?.fields.filter(
    field => field.chosen && field.chosen.confidence < 0.8 && field.chosen.confidence >= 0.6
  ) || [];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900">FormPilot</h1>
          </div>
          {parseResult && domInputs.length > 0 && (
            <Button 
              onClick={handleFillPage}
              className="formpilot-button-primary text-sm"
              disabled={readyToFillFields.length === 0}
            >
              Fill Page ({readyToFillFields.length})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 bg-white border-b">
          <TabsTrigger value="upload" className="flex items-center space-x-1">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center space-x-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Fields</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center space-x-1">
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Mapping</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-1">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="upload" className="h-full p-4">
            <FileUpload onUploadComplete={handleFileUpload} />
          </TabsContent>

          <TabsContent value="fields" className="h-full">
            <FieldList 
              fields={parseResult?.fields || []}
              readyToFill={readyToFillFields}
              needsReview={needsReviewFields}
            />
          </TabsContent>

          <TabsContent value="preview" className="h-full">
            <PDFPreview 
              documentId={currentDocument}
              parseResult={parseResult}
              selectedFields={selectedFields}
            />
          </TabsContent>

          <TabsContent value="mapping" className="h-full">
            <MappingEditor 
              domInputs={domInputs}
              fields={parseResult?.fields || []}
            />
          </TabsContent>

          <TabsContent value="settings" className="h-full p-4">
            <Settings />
          </TabsContent>
        </div>
      </Tabs>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            {parseResult ? (
              <span>{parseResult.fields.length} fields extracted</span>
            ) : (
              <span>No document loaded</span>
            )}
          </div>
          <div>
            {domInputs.length > 0 && (
              <span>{domInputs.length} inputs detected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};