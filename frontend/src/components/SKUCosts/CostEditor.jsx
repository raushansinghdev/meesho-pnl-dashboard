import { useState, useEffect } from 'react';
import { Save, Upload, Download, Search, AlertTriangle } from 'lucide-react';
import { listSKUCosts, bulkUpdateCosts, importCosts, exportCosts } from '../../api/client';

/**
 * CostEditor — Inline-editable table for SKU costs (v2 making + packaging split).
 */
export default function CostEditor() {
  const [costs, setCosts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);

  const loadCosts = async () => {
    setLoading(true);
    try {
      const data = await listSKUCosts();
      setCosts(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCosts(); }, []);

  const handleChange = (sku, field, value) => {
    setCosts(prev =>
      prev.map(c =>
        c.sku === sku ? { ...c, [field]: parseFloat(value) || 0 } : c
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const costMap = {};
      costs.forEach(c => {
        costMap[c.sku] = {
          making_cost: c.making_cost,
          packaging_cost: c.packaging_cost,
        };
      });
      await bulkUpdateCosts(costMap);
      setDirty(false);
      setMessage({ type: 'success', text: `${costs.length} SKU costs saved successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importCosts(file);
      await loadCosts();
      setMessage({ type: 'success', text: 'Costs imported successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportCosts();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sku_costs.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const filtered = costs.filter(c =>
    !search || c.sku.toLowerCase().includes(search.toLowerCase())
  );

  const unmappedCount = costs.filter(c => c.total_cost === 0).length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="search-input">
            <Search size={14} className="search-input__icon" />
            <input
              type="text"
              className="input"
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
          {unmappedCount > 0 && (
            <span className="badge badge--warning">
              <AlertTriangle size={10} />
              {unmappedCount} unmapped
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn--secondary btn--sm" onClick={handleExport}>
            <Download size={14} />
            Export JSON
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
          background: message.type === 'success' ? 'var(--success-muted)' : 'var(--danger-muted)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 560 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th style={{ textAlign: 'right' }}>Making Cost (₹)</th>
                <th style={{ textAlign: 'right' }}>Packaging Cost (₹)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    Loading SKU costs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No SKUs found
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.sku}>
                  <td style={{ fontWeight: 500 }}>
                    {c.sku}
                    {c.total_cost === 0 && (
                      <AlertTriangle size={12} style={{ marginLeft: 'var(--space-2)', color: 'var(--warning)', verticalAlign: 'middle' }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      className="input input--mono"
                      value={c.making_cost}
                      onChange={(e) => handleChange(c.sku, 'making_cost', e.target.value)}
                      style={{ width: 100, textAlign: 'right', padding: 'var(--space-2) var(--space-3)' }}
                      min="0"
                      step="1"
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      className="input input--mono"
                      value={c.packaging_cost}
                      onChange={(e) => handleChange(c.sku, 'packaging_cost', e.target.value)}
                      style={{ width: 100, textAlign: 'right', padding: 'var(--space-2) var(--space-3)' }}
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="number" style={{ fontWeight: 600, color: c.total_cost > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                    ₹{(c.making_cost + c.packaging_cost).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
