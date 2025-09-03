import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { parsePdf, previewUrl, type ParsedResponse } from '../api';
import { sendToActiveTab } from '../../shared/tabs';

type FieldItem = ParsedResponse['fields'][number];

export function SidebarApp() {
  const [parsed, setParsed] = useState<ParsedResponse | null>(null);
  const [selected, setSelected] = useState<FieldItem | null>(null);
  const parseMut = useMutation({
    mutationFn: async (file: File) => parsePdf(file),
    onSuccess: data => setParsed(data),
  });

  const sortedFields = useMemo(() => {
    if (!parsed) return [] as FieldItem[];
    return [...parsed.fields].sort((a, b) => (b.chosen?.confidence || 0) - (a.chosen?.confidence || 0));
  }, [parsed]);

  return (
    <div style={{ display: 'flex', gap: 12, height: '100vh' }}>
      <div style={{ width: 360, overflow: 'auto', padding: 12 }}>
        <h3>FormPilot</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => sendToActiveTab({ type: 'SCAN_PAGE' })}>Scan Page</button>
          {parsed && <button onClick={async () => {
            const scan = await sendToActiveTab({ type: 'SCAN_PAGE' });
            const res = await fetch((import.meta.env.VITE_API_URL as string || 'http://127.0.0.1:8000') + '/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: parsed.fields, inputs: scan.inputs })
            });
            const match = await res.json();
            const mapping: Record<string, string> = {};
            for (const item of [...match.high, ...match.medium]) mapping[item.selector] = item.value;
            await sendToActiveTab({ type: 'FILL_FIELDS', payload: { mapping } });
            const conf: Record<string, { confidence: number }> = {};
            for (const item of [...match.high, ...match.medium]) conf[item.selector] = { confidence: item.confidence };
            await sendToActiveTab({ type: 'OVERLAY_BADGES', payload: conf });
          }}>Fill Page</button>}
        </div>
        <input type="file" accept="application/pdf" onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) parseMut.mutate(f);
        }} />
        {parsed && (
          <>
            <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
              Pages: {parsed.meta.pages} {parsed.meta.scanned ? '(OCR suspected)' : ''}
            </div>
            <div style={{ marginTop: 12 }}>
              {sortedFields.map(f => (
                <div key={f.canonical} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, cursor: 'pointer', background: selected?.canonical === f.canonical ? '#eef2ff' : 'white' }} onClick={() => setSelected(f)}>
                  <div style={{ fontWeight: 600 }}>{f.canonical}</div>
                  <div style={{ fontSize: 12, color: '#374151' }}>{f.chosen?.value || f.candidates[0]?.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>conf {(f.chosen?.confidence ?? f.candidates[0]?.confidence ?? 0) * 100 | 0}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', placeItems: 'center', background: '#f3f4f6' }}>
        {!parsed && <div style={{ color: '#6b7280' }}>Upload a PDF to see preview</div>}
        {parsed && (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
            <img alt="preview" src={previewUrl(parsed.meta.file_id, selected?.chosen?.page || 1, selected?.chosen ? [{ page: selected.chosen.page, bbox: selected.chosen.bbox }] : undefined)} style={{ maxWidth: '100%', maxHeight: '100%', boxShadow: '0 2px 12px rgba(0,0,0,.1)', background: 'white' }} />
          </div>
        )}
      </div>
    </div>
  );
}

