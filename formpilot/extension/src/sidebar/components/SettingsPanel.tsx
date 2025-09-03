import React, { useState, useEffect } from 'react';
import { Cloud, Shield, Download, Upload, AlertTriangle } from 'lucide-react';

interface CloudProvider {
  id: string;
  name: string;
  enabled: boolean;
  estimatedCost: number;
}

export function SettingsPanel() {
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [autoFillThreshold, setAutoFillThreshold] = useState(0.92);
  const [privacyMode, setPrivacyMode] = useState(true);

  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  const loadSettings = async () => {
    const settings = await chrome.storage.local.get([
      'cloudEnabled',
      'selectedProvider',
      'apiKeys',
      'autoFillThreshold',
      'privacyMode'
    ]);
    
    setCloudEnabled(settings.cloudEnabled || false);
    setSelectedProvider(settings.selectedProvider || null);
    setApiKeys(settings.apiKeys || {});
    setAutoFillThreshold(settings.autoFillThreshold || 0.92);
    setPrivacyMode(settings.privacyMode !== false);
  };

  const loadProviders = async () => {
    // TODO: Load from backend
    setProviders([
      { id: 'google_docai', name: 'Google Document AI', enabled: false, estimatedCost: 0.01 },
      { id: 'aws_textract', name: 'AWS Textract', enabled: false, estimatedCost: 0.015 },
      { id: 'azure_document', name: 'Azure Document Intelligence', enabled: false, estimatedCost: 0.01 }
    ]);
  };

  const saveSettings = async () => {
    await chrome.storage.local.set({
      cloudEnabled,
      selectedProvider,
      apiKeys,
      autoFillThreshold,
      privacyMode
    });
  };

  const handleExportMappings = async () => {
    // TODO: Export mappings to YAML
    console.log('Exporting mappings...');
  };

  const handleImportMappings = async () => {
    // TODO: Import mappings from YAML
    console.log('Importing mappings...');
  };

  return (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Privacy Settings
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Local Processing Only</span>
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={(e) => {
                setPrivacyMode(e.target.checked);
                if (e.target.checked) setCloudEnabled(false);
              }}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            When enabled, all processing happens locally. No data is sent to cloud services.
          </p>
        </div>
      </div>

      {/* Cloud Providers */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Cloud className="w-4 h-4 mr-2" />
          Cloud Providers
        </h3>
        
        {privacyMode && (
          <div className="p-3 mb-3 bg-warning-50 border border-warning-200 rounded-md">
            <p className="text-sm text-warning-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cloud providers are disabled in privacy mode
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable Cloud Processing</span>
            <input
              type="checkbox"
              checked={cloudEnabled}
              onChange={(e) => setCloudEnabled(e.target.checked)}
              disabled={privacyMode}
              className="rounded text-primary-600 focus:ring-primary-500 disabled:opacity-50"
            />
          </label>
          
          {cloudEnabled && !privacyMode && (
            <div className="space-y-2">
              {providers.map(provider => (
                <div key={provider.id} className="p-2 border border-gray-200 rounded-md">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.id}
                      checked={selectedProvider === provider.id}
                      onChange={() => setSelectedProvider(provider.id)}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{provider.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ~${provider.estimatedCost}/page
                      </span>
                    </div>
                  </label>
                  {selectedProvider === provider.id && (
                    <input
                      type="password"
                      placeholder="API Key"
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                      className="mt-2 w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Extraction Settings */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Extraction Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">
              Auto-fill Confidence Threshold: {(autoFillThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={autoFillThreshold * 100}
              onChange={(e) => setAutoFillThreshold(Number(e.target.value) / 100)}
              className="w-full mt-1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Mapping Profiles</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportMappings}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <Download className="inline-block w-4 h-4 mr-1" />
            Export
          </button>
          <button
            onClick={handleImportMappings}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <Upload className="inline-block w-4 h-4 mr-1" />
            Import
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Save Settings
      </button>
    </div>
  );
}