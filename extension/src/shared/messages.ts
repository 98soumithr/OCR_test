export type Message =
  | { type: 'PING' }
  | { type: 'SCAN_PAGE' }
  | { type: 'FILL_FIELDS'; payload: { mapping: Record<string, string> } }
  | { type: 'OVERLAY_BADGES' };

export type ScanResult = {
  inputs: Array<{
    tag: string;
    type?: string;
    selector: string;
    xpath: string;
    labelText: string;
    placeholder?: string;
    ariaLabel?: string;
    name?: string;
    id?: string;
    rect: { x: number; y: number; width: number; height: number };
  }>;
};
