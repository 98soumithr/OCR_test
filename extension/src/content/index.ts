import type { Message, ScanResult } from '../shared/messages';

function toCssSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const id = (current as HTMLElement).id;
    const name = (current as HTMLElement).getAttribute('name');
    const tag = current.tagName.toLowerCase();
    if (id) {
      parts.unshift(`${tag}#${CSS.escape(id)}`);
      break;
    }
    let selector = tag;
    if (name) selector += `[name="${CSS.escape(name)}"]`;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

function getXPath(el: Element): string {
  const idx = (sib: Element) => Array.from(sib.parentNode?.childNodes || []).filter(n => n.nodeType === 1 && (n as Element).tagName === sib.tagName).indexOf(sib) + 1;
  const segs: string[] = [];
  for (let node: Element | null = el; node && node.nodeType === 1; node = node.parentElement) {
    const id = (node as HTMLElement).id;
    if (id) { segs.unshift(`//*[@id='${id}']`); break; }
    const i = idx(node);
    segs.unshift(`${node.tagName.toLowerCase()}[${i}]`);
  }
  return '/' + segs.join('/');
}

function nearestLabelText(input: HTMLElement): string {
  const id = input.id;
  if (id) {
    const forLbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (forLbl) return forLbl.textContent?.trim() || '';
  }
  const label = input.closest('label');
  if (label) return label.textContent?.trim() || '';
  // find previous text node
  let node: Node | null = input.previousSibling;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || '').trim();
      if (t) return t;
    }
    node = node.previousSibling;
  }
  return '';
}

function rectOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

export function scanPage(): ScanResult {
  const inputs = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLElement[];
  const out = inputs.map(el => {
    const html = el as HTMLInputElement;
    return {
      tag: el.tagName.toLowerCase(),
      type: html.type,
      selector: toCssSelector(el),
      xpath: getXPath(el),
      labelText: nearestLabelText(el),
      placeholder: html.placeholder,
      ariaLabel: html.getAttribute('aria-label') || undefined,
      name: html.name || undefined,
      id: html.id || undefined,
      rect: rectOf(el)
    };
  });
  return { inputs: out };
}

export function fillFields(mapping: Record<string, string>) {
  for (const [selector, value] of Object.entries(mapping)) {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!el) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') {
      const opt = Array.from((el as HTMLSelectElement).options).find(o => o.value === value || o.text === value);
      if (opt) (el as HTMLSelectElement).value = opt.value;
    } else {
      (el as HTMLInputElement).value = value;
      (el as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
      (el as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

export function overlayBadges(mapping: Record<string, { confidence: number }>) {
  for (const [selector, meta] of Object.entries(mapping)) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) continue;
    const badge = document.createElement('span');
    badge.textContent = '✓';
    badge.style.position = 'absolute';
    badge.style.background = '#16a34a';
    badge.style.color = 'white';
    badge.style.borderRadius = '9999px';
    badge.style.fontSize = '12px';
    badge.style.lineHeight = '12px';
    badge.style.width = '16px';
    badge.style.height = '16px';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.transform = 'translate(8px, -8px)';
    badge.title = `Confidence: ${(meta.confidence * 100).toFixed(0)}%`;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    el.parentElement?.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    wrapper.appendChild(badge);
  }
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === 'PING') sendResponse({ ok: true });
  if (msg.type === 'SCAN_PAGE') sendResponse(scanPage());
  if (msg.type === 'FILL_FIELDS') {
    fillFields(msg.payload.mapping);
    sendResponse({ ok: true });
  }
  if (msg.type === 'OVERLAY_BADGES') {
    overlayBadges(msg.payload as any);
    sendResponse({ ok: true });
  }
});

