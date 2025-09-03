import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient();

function App() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 12 }}>
      <h3>FormPilot</h3>
      <p>PDF fields will appear here. Select a field to preview and fill.</p>
      <button onClick={() => chrome.runtime.sendMessage({ type: 'SCAN_PAGE' })}>Scan Page</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
