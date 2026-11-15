/** AI-assisted implementation. Scope and sources: AI_USAGE.md. */
const KEY = 'beyond-earth-records-v1';
export function readRecords(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data.filter(r => r && typeof r.id === 'string' && ['success','failed','landed'].includes(r.result)).slice(0,100) : [];
  } catch { return []; }
}
export function saveRecord(record, storage = globalThis.localStorage) {
  const rows = readRecords(storage);
  if (rows.some(row => row.id === record.id)) return true;
  try {
    storage.setItem(KEY, JSON.stringify([record,...rows].slice(0,100)));
    globalThis.dispatchEvent?.(new Event('mission-records-changed'));
    return true;
  } catch { return false; }
}
export function downloadRecords(rows) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));
  const a = document.createElement('a');
  a.href = url; a.download = 'Beyond-Earth-Mission-Records.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
