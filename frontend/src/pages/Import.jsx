import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, FileText, Loader } from 'lucide-react';
import Papa from 'papaparse';
import { apiFetch } from '../lib/supabase';

const REQUIRED_FIELDS = ['name', 'phone'];
const OPTIONAL_FIELDS = ['address'];

export default function Import() {
  const [step, setStep] = useState('upload'); // upload | map | preview | done
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ name: '', phone: '', address: '' });
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setRawRows(data);
        setHeaders(meta.fields || []);
        // Auto-detect common column names
        const autoMap = { name: '', phone: '', address: '' };
        meta.fields.forEach(f => {
          const lower = f.toLowerCase();
          if (!autoMap.name && ['name', 'full name', 'contact name', 'seller name'].includes(lower)) autoMap.name = f;
          if (!autoMap.phone && ['phone', 'phone number', 'cell', 'mobile', 'number'].includes(lower)) autoMap.phone = f;
          if (!autoMap.address && ['address', 'property address', 'street'].includes(lower)) autoMap.address = f;
        });
        setMapping(autoMap);
        setStep('map');
      },
      error: () => setError('Failed to parse CSV. Make sure it is a valid CSV file.'),
    });
  }

  function buildPreview() {
    if (!mapping.name || !mapping.phone) {
      setError('Name and phone columns are required.');
      return;
    }
    const rows = rawRows
      .map(row => ({
        name: row[mapping.name]?.trim(),
        phone: row[mapping.phone]?.trim(),
        address: mapping.address ? row[mapping.address]?.trim() : undefined,
      }))
      .filter(r => r.name && r.phone);
    setPreview(rows);
    setError('');
    setStep('preview');
  }

  async function handleImport() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ leads: preview }),
      });
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep('upload');
    setRawRows([]); setHeaders([]); setMapping({ name: '', phone: '', address: '' });
    setPreview([]); setResult(null); setError('');
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Import Leads</h1>
      <p className="text-sm text-muted mb-8">Upload a CSV of motivated sellers. AI follow-ups start automatically.</p>

      {step === 'upload' && (
        <div>
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            className="glass rounded-2xl border-2 border-dashed border-border hover:border-accent/40 p-16 flex flex-col items-center justify-center cursor-pointer transition-all group"
          >
            <Upload size={32} className="text-muted group-hover:text-accent mb-4 transition-colors" />
            <p className="font-display font-semibold text-text-primary mb-1">Drop your CSV here</p>
            <p className="text-sm text-muted">or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
          <p className="text-xs text-muted mt-4 flex items-center gap-1.5">
            <FileText size={12} />
            CSV should include at minimum: name, phone number. Address is optional.
          </p>
        </div>
      )}

      {step === 'map' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold text-text-primary mb-1">Map your columns</h2>
          <p className="text-sm text-muted mb-6">{rawRows.length} rows found — match your CSV columns to the right fields.</p>

          <div className="space-y-4">
            {['name', 'phone', 'address'].map(field => (
              <div key={field}>
                <label className="text-xs text-text-secondary block mb-1.5 capitalize">
                  {field} {REQUIRED_FIELDS.includes(field) && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={mapping[field]}
                  onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
                >
                  <option value="">— skip —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={reset} className="px-4 py-2.5 text-sm text-muted hover:text-text-primary transition-colors">Back</button>
            <button onClick={buildPreview} className="flex-1 bg-accent text-bg font-semibold py-2.5 rounded-xl text-sm hover:bg-accent/90 transition-all">
              Preview Import
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="glass rounded-2xl p-6 mb-4">
            <h2 className="font-display font-semibold text-text-primary mb-1">Ready to import</h2>
            <p className="text-sm text-muted mb-4">{preview.length} valid leads ready. Duplicates by phone will be skipped.</p>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Phone</th>
                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2.5 text-text-primary">{row.name}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{row.phone}</td>
                      <td className="px-4 py-2.5 text-muted truncate max-w-[160px]">{row.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 8 && (
                <p className="text-xs text-muted text-center py-2.5 border-t border-border">
                  + {preview.length - 8} more rows
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setStep('map')} className="px-4 py-2.5 text-sm text-muted hover:text-text-primary transition-colors">Back</button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-accent text-bg font-semibold py-2.5 rounded-xl text-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Loader size={15} className="animate-spin" /> Importing...</> : `Import ${preview.length} Leads`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="glass rounded-2xl p-10 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-text-primary mb-2">Import Complete</h2>
          <p className="text-text-secondary mb-1">{result?.imported} leads imported successfully.</p>
          <p className="text-sm text-muted mb-8">AI follow-ups are scheduled and will start automatically.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-5 py-2.5 text-sm text-muted border border-border rounded-xl hover:text-text-primary hover:border-border/80 transition-all">
              Import More
            </button>
            <a href="/dashboard" className="px-5 py-2.5 text-sm bg-accent text-bg font-semibold rounded-xl hover:bg-accent/90 transition-all">
              View Pipeline
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
