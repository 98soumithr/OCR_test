/**
 * Settings Component - Configure FormPilot behavior and cloud providers
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/Button';
import { 
  Settings as SettingsIcon,
  Cloud,
  Shield,
  Sliders,
  Key,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SettingsData {
  autoFillEnabled: boolean;
  confidenceThreshold: number;
  cloudProvidersEnabled: boolean;
  selectedProvider: string;
}

interface ProviderStatus {
  provider: string;
  enabled: boolean;
  configured: boolean;
  cost_per_page: number;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    autoFillEnabled: true,
    confidenceThreshold: 0.8,
    cloudProvidersEnabled: false,
    selectedProvider: 'local'
  });

  const queryClient = useQueryClient();

  // Load settings on mount
  useEffect(() => {
    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        setSettings(prev => ({ ...prev, ...result.settings }));
      }
    });
  }, []);

  // Query provider status
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/providers/status');
      if (!response.ok) {
        throw new Error('Failed to fetch provider status');
      }
      return response.json() as Promise<Record<string, ProviderStatus>>;
    }
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: SettingsData) => {
      await chrome.storage.local.set({ settings: newSettings });
      return newSettings;
    },
    onSuccess: (newSettings) => {
      setSettings(newSettings);
    }
  });

  const handleSettingChange = (key: keyof SettingsData, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings.mutate(newSettings);
  };

  const testProvider = async (provider: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/providers/${provider}/test`);
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${provider} connection successful: ${result.message}`);
      } else {
        alert(`❌ ${provider} connection failed: ${result.detail}`);
      }
    } catch (error) {
      alert(`❌ ${provider} connection error: ${error.message}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-4">
        
        {/* General Settings */}
        <section className="formpilot-card">
          <div className="flex items-center space-x-2 mb-4">
            <Sliders className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
          </div>

          <div className="space-y-4">
            {/* Auto-fill Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auto-fill forms
                </label>
                <div className="text-xs text-gray-500">
                  Automatically fill detected form fields
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoFillEnabled}
                  onChange={(e) => handleSettingChange('autoFillEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="formpilot-card">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Privacy & Processing</h3>
          </div>

          <div className="space-y-4">
            {/* Cloud Providers Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable cloud processing
                </label>
                <div className="text-xs text-gray-500">
                  Use cloud APIs for better accuracy (requires API keys)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.cloudProvidersEnabled}
                  onChange={(e) => handleSettingChange('cloudProvidersEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Provider Selection */}
            {settings.cloudProvidersEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Provider
                </label>
                <select
                  value={settings.selectedProvider}
                  onChange={(e) => handleSettingChange('selectedProvider', e.target.value)}
                  className="w-full formpilot-input"
                >
                  <option value="local">Local Processing (Free)</option>
                  <option value="docai">Google Document AI</option>
                  <option value="textract">AWS Textract</option>
                  <option value="azure">Azure Document Intelligence</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Cloud Providers Status */}
        {settings.cloudProvidersEnabled && (
          <section className="formpilot-card">
            <div className="flex items-center space-x-2 mb-4">
              <Cloud className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cloud Providers</h3>
            </div>

            {providersLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
                <div className="text-sm text-gray-600 mt-2">Loading provider status...</div>
              </div>
            ) : providers ? (
              <div className="space-y-4">
                {Object.entries(providers).map(([key, provider]) => (
                  <ProviderCard
                    key={key}
                    name={key}
                    provider={provider}
                    onTest={() => testProvider(key)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Unable to load provider status
              </div>
            )}
          </section>
        )}

        {/* Data Management */}
        <section className="formpilot-card">
          <div className="flex items-center space-x-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
          </div>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                chrome.storage.local.clear(() => {
                  alert('All data cleared');
                  window.location.reload();
                });
              }}
            >
              Clear All Data
            </Button>
            
            <div className="text-xs text-gray-500">
              This will remove all uploaded documents, mapping profiles, and settings.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

interface ProviderCardProps {
  name: string;
  provider: ProviderStatus;
  onTest: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ name, provider, onTest }) => {
  const getStatusIcon = () => {
    if (provider.configured) {
      return <CheckCircle className="w-4 h-4 text-success-600" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-warning-600" />;
    }
  };

  const getStatusText = () => {
    if (provider.configured) {
      return 'Configured';
    } else {
      return 'Not configured';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900 capitalize">{name}</h4>
          {getStatusIcon()}
          <span className={`text-sm ${provider.configured ? 'text-success-600' : 'text-warning-600'}`}>
            {getStatusText()}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onTest}
          disabled={!provider.configured}
        >
          Test
        </Button>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <DollarSign className="w-3 h-3" />
          <span>${provider.cost_per_page}/page</span>
        </div>
        {provider.estimated_monthly_limit && (
          <div className="flex items-center space-x-1">
            <span>~{provider.estimated_monthly_limit}/month</span>
          </div>
        )}
      </div>

      {!provider.configured && (
        <div className="mt-2 text-xs text-gray-500">
          Configure API keys in environment variables
        </div>
      )}
    </div>
  );
};