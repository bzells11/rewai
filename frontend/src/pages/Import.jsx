import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, FileText, Loader, UserPlus, Users, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';
import Papa from 'papaparse';
import { apiFetch } from '../lib/supabase';
import { DEMO_MODE } from '../lib/demo';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const REQUIRED_FIELDS = ['name', 'phone'];

export default function Import() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(searchParams.get('mode') === 'single' ? 'single' : 'csv');

  useEffect(() => {
    setMode(searchParams.get('mode') === 'single' ? 'single' : 'csv');
  }, [searchParams]);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-2">Add Leads</h1>
      <p className="text-sm text-muted mb-6">Import a list or add a single lead manually.</p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-8 p-1 bg-dim/4 border border-border rounded-xl w-fit">
        {[
          { key: 'csv', icon: Users, label: 'Import CSV' },
          { key: 'single', icon: UserPlus, label: 'Add Manually' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${mode === key
                ? 'bg-accent text-bg shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {mode === 'csv'
        ? <CSVImport />
        : <SingleLeadForm onSuccess={() => navigate('/dashboard')} />
      }
    </div>
  );
}

/* ── Manual single-lead form ── */
function SingleLeadForm({ onSuccess }) {
  const [fields, setFields] = useState({ name: '', phone: '', address: '', situation: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fields.name.trim() || !fields.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: fields.name.trim(),
          phone: fields.phone.trim(),
          address: fields.address.trim() || undefined,
          situation: fields.situation.trim() || undefined,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl text-text-primary mb-2">Lead Added</h2>
        <p className="text-text-secondary mb-1">{fields.name} has been added to your pipeline.</p>
        <p className="text-sm text-muted mb-8">AI follow-ups are scheduled and will start automatically.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setDone(false); setFields({ name: '', phone: '', address: '', situation: '' }); }}
            className="px-5 py-2.5 text-sm text-muted border border-border rounded-xl hover:text-text-primary transition-all"
          >
            Add Another
          </button>
          <button
            onClick={onSuccess}
            className="px-5 py-2.5 text-sm bg-accent text-bg font-semibold rounded-xl hover:bg-accent/90 transition-all"
          >
            View Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
      {[
        { key: 'name', label: 'Full Name', placeholder: 'John Smith', required: true, type: 'text' },
        { key: 'phone', label: 'Phone Number', placeholder: '+1 (614) 555-0000', required: true, type: 'tel' },
        { key: 'address', label: 'Property Address', placeholder: '123 Main St, Columbus, OH', required: false, type: 'text' },
      ].map(({ key, label, placeholder, required, type }) => (
        <div key={key}>
          <label className="text-xs text-text-secondary block mb-1.5">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          <input
            type={type}
            value={fields[key]}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full bg-dim/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      ))}

      <div>
        <label className="text-xs text-text-secondary block mb-1.5">Situation <span className="text-muted">(optional)</span></label>
        <textarea
          value={fields.situation}
          onChange={e => set('situation', e.target.value)}
          placeholder="e.g. Inherited property, needs to sell fast, behind on taxes..."
          rows={3}
          className="w-full bg-dim/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none leading-relaxed"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-bg font-semibold py-2.5 rounded-xl text-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
      >
        {loading ? <><Loader size={15} className="animate-spin" /> Adding...</> : 'Add Lead'}
      </button>
    </form>
  );
}

const OPTIONAL_FIELDS = [
  { key: 'address',      label: 'Property Address', patterns: ['address', 'property address', 'street', 'property'] },
  { key: 'situation',    label: 'Situation / Notes', patterns: ['situation', 'notes', 'motivation', 'reason', 'description', 'comments'] },
  { key: 'asking_price', label: 'Asking Price',      patterns: ['asking price', 'asking', 'list price', 'price', 'arv'] },
  { key: 'timeline',     label: 'Timeline',          patterns: ['timeline', 'close by', 'close date', 'when', 'timeframe'] },
];

const REQ_FIELDS = [
  { key: 'first_name', label: 'First Name', patterns: ['first name', 'first', 'fname', 'given name', 'name', 'full name', 'contact name', 'seller name'] },
  { key: 'last_name',  label: 'Last Name',  patterns: ['last name', 'last', 'lname', 'surname', 'family name'] },
  { key: 'phone',      label: 'Phone Number', patterns: ['phone', 'phone number', 'cell', 'mobile', 'number'] },
];

/* ── CSV import wizard ── */
function CSVImport() {
  const [step, setStep] = useState('upload');
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [reqMap, setReqMap] = useState({ first_name: '', last_name: '', phone: '' });
  // optional: array of field keys that are active (column auto-detected from patterns)
  const [activeOpt, setActiveOpt] = useState([]);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  async function loadSample() {
    try {
      const text = await fetch(`${API}/demo/sample-leads.csv`).then(r => r.text());
      handleFile(text);
    } catch {
      setError('Could not load the sample CSV.');
    }
  }

  function handleFile(file) {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setRawRows(data);
        setHeaders(meta.fields || []);
        const m = { first_name: '', last_name: '', phone: '' };
        const autoOpt = [];
        meta.fields.forEach(f => {
          const lower = f.toLowerCase();
          REQ_FIELDS.forEach(({ key, patterns }) => {
            if (!m[key] && patterns.some(p => lower.includes(p))) m[key] = f;
          });
          OPTIONAL_FIELDS.forEach(({ key, patterns }) => {
            if (!autoOpt.includes(key) && patterns.some(p => lower.includes(p))) autoOpt.push(key);
          });
        });
        setReqMap(m);
        setActiveOpt(autoOpt);
        setStep('map');
      },
      error: () => setError('Failed to parse CSV. Make sure it is a valid CSV file.'),
    });
  }

  // Find the best matching column for an optional field from headers
  function findColumn(fieldKey) {
    const field = OPTIONAL_FIELDS.find(f => f.key === fieldKey);
    if (!field) return '';
    for (const h of headers) {
      if (field.patterns.some(p => h.toLowerCase().includes(p))) return h;
    }
    return '';
  }

  const availableToAdd = OPTIONAL_FIELDS.filter(f => !activeOpt.includes(f.key));

  function addOptField(key) {
    if (!key || activeOpt.includes(key)) return;
    setActiveOpt(prev => [...prev, key]);
  }
  function removeOptField(key) { setActiveOpt(prev => prev.filter(k => k !== key)); }

  function buildPreview() {
    if (!reqMap.first_name || !reqMap.phone) {
      setError('Name and phone are required — select the columns below.');
      return;
    }
    const rows = rawRows.map(row => {
      const firstName = row[reqMap.first_name]?.trim() || '';
      const lastName  = reqMap.last_name ? (row[reqMap.last_name]?.trim() || '') : '';
      const name      = [firstName, lastName].filter(Boolean).join(' ');
      const phone     = row[reqMap.phone]?.trim();
      const extra = {};
      activeOpt.forEach(key => {
        const col = findColumn(key);
        const val = col ? row[col]?.trim() : undefined;
        if (val) extra[key] = val;
      });
      return { name, phone, ...extra };
    }).filter(r => r.name && r.phone);
    setPreview(rows);
    setError('');
    setStep('preview');
  }

  async function handleImport() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/leads/bulk', { method: 'POST', body: JSON.stringify({ leads: preview }) });
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
    setRawRows([]); setHeaders([]); setReqMap({ first_name: '', last_name: '', phone: '' }); setActiveOpt([]);
    setPreview([]); setResult(null); setError('');
  }

  if (step === 'upload') return (
    <div>
      <div
        onClick={() => { fileRef.current.value = ''; fileRef.current.click(); }}
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
        Must include first name, last name, and phone. Address, situation, asking price, and timeline are optional.
      </p>
      {DEMO_MODE && (
        <button
          onClick={loadSample}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-all"
        >
          Use the sample CSV (25 fake owners)
        </button>
      )}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );

  if (step === 'map') return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-display font-semibold text-text-primary mb-1">Confirm your columns</h2>
      <p className="text-sm text-muted mb-6">{rawRows.length} rows found — we auto-detected your columns below.</p>

      {/* Required */}
      <div className="mb-7">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Required</p>
        <div className="space-y-2.5">
          {REQ_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-text-secondary">{label}</span>
              {reqMap[key] ? (
                <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-xs font-medium px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={12} /> {reqMap[key]}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <AlertCircle size={13} className="text-amber-400 shrink-0" />
                  <select
                    value={reqMap[key]}
                    onChange={e => setReqMap(m => ({ ...m, [key]: e.target.value }))}
                    className="flex-1 bg-dim/5 border border-amber-400/40 rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
                  >
                    <option value="">— select column —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional — single dropdown to add, chips to remove */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Optional fields</p>

        {/* Single add dropdown */}
        {availableToAdd.length > 0 && (
          <select
            value=""
            onChange={e => { addOptField(e.target.value); e.target.value = ''; }}
            className="w-full bg-dim/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 mb-3"
          >
            <option value="">+ Add optional field...</option>
            {availableToAdd.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        )}

        {/* Active optional field chips */}
        {activeOpt.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeOpt.map(key => {
              const field = OPTIONAL_FIELDS.find(f => f.key === key);
              return (
                <div key={key} className="flex items-center gap-1.5 bg-accent/8 border border-accent/15 text-accent text-xs font-medium px-3 py-1.5 rounded-lg">
                  {field?.label}
                  <button onClick={() => removeOptField(key)} className="ml-1 text-accent/60 hover:text-red-400 transition-colors">
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {availableToAdd.length === OPTIONAL_FIELDS.length && (
          <p className="text-xs text-muted">Select from the dropdown above to import additional fields.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <div className="flex gap-3 mt-6">
        <button onClick={reset} className="px-4 py-2.5 text-sm text-muted hover:text-text-primary transition-colors">Back</button>
        <button onClick={buildPreview} className="flex-1 bg-accent text-bg font-semibold py-2.5 rounded-xl text-sm hover:bg-accent/90 transition-all">
          Preview Import
        </button>
      </div>
    </div>
  );

  if (step === 'preview') return (
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
                <tr key={i} className="border-b border-border-subtle last:border-0">
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
  );

  if (step === 'done') return (
    <div className="glass rounded-2xl p-10 text-center">
      <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
      <h2 className="font-display font-bold text-xl text-text-primary mb-2">Import Complete</h2>
      <p className="text-text-secondary mb-1">{result?.imported} leads imported successfully.</p>
      {result?.imported === 0 && (
        <p className="text-sm text-amber-400 mb-2">All leads in this file already exist — duplicate phone numbers are skipped.</p>
      )}
      <p className="text-sm text-muted mb-8">AI follow-ups are scheduled and will start automatically.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="px-5 py-2.5 text-sm text-muted border border-border rounded-xl hover:text-text-primary transition-all">
          Import More
        </button>
        <a href="/dashboard" className="px-5 py-2.5 text-sm bg-accent text-bg font-semibold rounded-xl hover:bg-accent/90 transition-all">
          View Pipeline
        </a>
      </div>
    </div>
  );
}
