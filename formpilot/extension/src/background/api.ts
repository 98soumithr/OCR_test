/**
 * API Client - Handles communication with backend service
 */

import { ExtractedData } from '@shared/types';

export class APIClient {
  private baseURL = 'http://localhost:8000';

  /**
   * Extract PDF using backend service
   */
  public async extractPDF(
    file: File,
    useCloud: boolean = false,
    cloudProvider?: string
  ): Promise<ExtractedData> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    params.append('use_cloud', useCloud.toString());
    if (cloudProvider) {
      params.append('cloud_provider', cloudProvider);
    }

    const response = await fetch(`${this.baseURL}/parse?${params}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to extract PDF: ${error}`);
    }

    return response.json();
  }

  /**
   * Get PDF preview
   */
  public async getPreview(
    fileId: string,
    page: number = 1,
    highlightBoxes?: any[]
  ): Promise<string> {
    const params = new URLSearchParams();
    params.append('file_id', fileId);
    params.append('page', page.toString());
    if (highlightBoxes) {
      params.append('highlight_boxes', JSON.stringify(highlightBoxes));
    }

    const response = await fetch(`${this.baseURL}/preview?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to get preview');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  /**
   * Get available cloud providers
   */
  public async getProviders(): Promise<any> {
    const response = await fetch(`${this.baseURL}/providers`);
    
    if (!response.ok) {
      throw new Error('Failed to get providers');
    }

    return response.json();
  }

  /**
   * Estimate cloud provider cost
   */
  public async estimateCost(provider: string, pages: number): Promise<any> {
    const params = new URLSearchParams();
    params.append('pages', pages.toString());

    const response = await fetch(`${this.baseURL}/providers/${provider}/estimate?${params}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to estimate cost');
    }

    return response.json();
  }

  /**
   * Get canonical field names
   */
  public async getCanonicalFields(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/fields/canonical`);
    
    if (!response.ok) {
      throw new Error('Failed to get canonical fields');
    }

    const data = await response.json();
    return data.fields;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}