import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../../utils/messaging';

interface Settings {
  apiEndpoint: string;
  useCloudProviders: boolean;
  confidenceThreshold: number;
  autoFillEnabled: boolean;
  googleApiKey?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  azureApiKey?: string;
  azureEndpoint?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    apiEndpoint: 'http://localhost:8000',
    useCloudProviders: false,
    confidenceThreshold: 0.8,
    autoFillEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Query for current settings
  const { data: currentSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await sendMessage({ type: 'GET_STORAGE', keys: ['formpilot_settings'] });
      return response.data.formpilot_settings as Settings;
    },
  });

  // Update settings when query data changes
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await sendMessage({
        type: 'SET_STORAGE',
        data: { formpilot_settings: settings }
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${settings.apiEndpoint}/`);
      if (response.ok) {
        alert('Connection successful!');
      } else {
        alert('Connection failed: Server returned an error');
      }
    } catch (error) {
      alert('Connection failed: Unable to reach server');
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all FormPilot data? This cannot be undone.')) {
      try {
        await sendMessage({
          type: 'SET_STORAGE',
          data: {
            formpilot_mapping_profiles: {},
            formpilot_fill_logs: []
          }
        });
        alert('Data cleared successfully!');
      } catch (error) {
        console.error('Failed to clear data:', error);
        alert('Failed to clear data');
      }
    }
  };

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="setting-group">
        <h3>API Configuration</h3>
        
        <div className="setting-item">
          <label className="setting-label">API Endpoint</label>
          <div className="setting-control">
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={(e) => handleSettingChange('apiEndpoint', e.target.value)}
              className="setting-input"
            />
            <button
              className="btn btn-small btn-secondary"
              onClick={handleTestConnection}
            >
              Test
            </button>
          </div>
        </div>

        <div className="setting-item">
          <label className="setting-label">Use Cloud Providers</label>
          <div className="setting-control">
            <div
              className={`toggle ${settings.useCloudProviders ? 'active' : ''}`}
              onClick={() => handleSettingChange('useCloudProviders', !settings.useCloudProviders)}
            />
          </div>
        </div>
      </div>

      {settings.useCloudProviders && (
        <div className="setting-group">
          <h3>Cloud Provider Settings</h3>
          
          <div className="setting-item">
            <label className="setting-label">Google Document AI API Key</label>
            <div className="setting-control">
              <input
                type="password"
                value={settings.googleApiKey || ''}
                onChange={(e) => handleSettingChange('googleApiKey', e.target.value)}
                className="setting-input"
                placeholder="Enter API key"
              />
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">AWS Access Key ID</label>
            <div className="setting-control">
              <input
                type="password"
                value={settings.awsAccessKey || ''}
                onChange={(e) => handleSettingChange('awsAccessKey', e.target.value)}
                className="setting-input"
                placeholder="Enter access key"
              />
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">AWS Secret Access Key</label>
            <div className="setting-control">
              <input
                type="password"
                value={settings.awsSecretKey || ''}
                onChange={(e) => handleSettingChange('awsSecretKey', e.target.value)}
                className="setting-input"
                placeholder="Enter secret key"
              />
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">Azure API Key</label>
            <div className="setting-control">
              <input
                type="password"
                value={settings.azureApiKey || ''}
                onChange={(e) => handleSettingChange('azureApiKey', e.target.value)}
                className="setting-input"
                placeholder="Enter API key"
              />
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">Azure Endpoint</label>
            <div className="setting-control">
              <input
                type="text"
                value={settings.azureEndpoint || ''}
                onChange={(e) => handleSettingChange('azureEndpoint', e.target.value)}
                className="setting-input"
                placeholder="https://your-resource.cognitiveservices.azure.com/"
              />
            </div>
          </div>
        </div>
      )}

      <div className="setting-group">
        <h3>Form Filling</h3>
        
        <div className="setting-item">
          <label className="setting-label">Auto-fill Enabled</label>
          <div className="setting-control">
            <div
              className={`toggle ${settings.autoFillEnabled ? 'active' : ''}`}
              onClick={() => handleSettingChange('autoFillEnabled', !settings.autoFillEnabled)}
            />
          </div>
        </div>

        <div className="setting-item">
          <label className="setting-label">Confidence Threshold</label>
          <div className="setting-control">
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              value={settings.confidenceThreshold}
              onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
              className="setting-slider"
            />
            <span className="setting-value">{Math.round(settings.confidenceThreshold * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="setting-group">
        <h3>Data Management</h3>
        
        <div className="setting-item">
          <label className="setting-label">Clear All Data</label>
          <div className="setting-control">
            <button
              className="btn btn-secondary"
              onClick={handleClearData}
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-info">
        <h3>About FormPilot</h3>
        <p>Version: 1.0.0</p>
        <p>FormPilot helps you extract data from PDFs and autofill web forms with confidence tracking and provenance.</p>
        
        <h4>Privacy Notice</h4>
        <p>By default, FormPilot processes all data locally. Cloud providers are only used when explicitly enabled and configured.</p>
        
        <h4>Support</h4>
        <p>For issues or feature requests, please check the documentation or contact support.</p>
      </div>
    </div>
  );
};

export default Settings;