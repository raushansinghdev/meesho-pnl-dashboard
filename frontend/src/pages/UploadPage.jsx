import { useState } from 'react';
import { Upload, Play, Loader, CheckCircle, ArrowRight } from 'lucide-react';
import FileUpload from '../components/Upload/FileUpload';
import LossRates from '../components/Settings/LossRates';
import { computePnL, getCurrentPaymentFileMeta } from '../api/client';
import { loadCosts } from '../services/skuCosts';
import { useNavigate } from 'react-router-dom';

export default function UploadPage({ lossRates, setLossRates, onPnLComputed }) {
  const [paymentFileId, setPaymentFileId] = useState(() => getCurrentPaymentFileMeta()?.file_id || null);
  const [ordersFileId, setOrdersFileId] = useState(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const [computed, setComputed] = useState(false);
  const navigate = useNavigate();

  const handleCompute = async () => {
    if (!paymentFileId) return;
    setComputing(true);
    setError(null);
    setComputed(false);

    try {
      const result = await computePnL(paymentFileId, ordersFileId, lossRates);
      onPnLComputed(result);
      setComputed(true);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setComputing(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">
          <Upload size={20} style={{ color: 'var(--accent)' }} />
          Upload
        </h1>
        <p className="page-header__subtitle">
          Upload Meesho exports and compute your realized P&L
        </p>
      </div>

      <div className="page-body">
        {/* File Uploads */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Upload Files</div>
          <FileUpload
            onPaymentUploaded={(meta) => {
              setPaymentFileId(meta.file_id);
              if (meta.has_missing_costs) {
                navigate('/sku-costs');
              }
            }}
            onOrdersUploaded={(meta) => setOrdersFileId(meta.file_id)}
          />
        </div>

        {/* Loss Rates — Compact */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Loss Rates</div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Adjust COGS fractions per outcome
            </span>
          </div>
          <LossRates lossRates={lossRates} onChange={setLossRates} />
        </div>

        {/* Compute */}
        <div className="card">
          {error && (
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
              background: 'var(--danger-muted)',
              color: 'var(--danger)',
              fontSize: 'var(--text-sm)',
            }}>
              {error}
            </div>
          )}

          {computed && (
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
              background: 'var(--success-muted)',
              color: 'var(--success)',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <CheckCircle size={14} />
                P&L computed successfully!
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')} style={{ color: 'var(--success)' }}>
                View Dashboard <ArrowRight size={13} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button
              className="btn btn--primary"
              onClick={handleCompute}
              disabled={!paymentFileId || computing}
              style={{ flex: 1 }}
            >
              {computing ? (
                <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Computing...</>
              ) : (
                <><Play size={16} /> Compute P&L</>
              )}
            </button>
            {!paymentFileId && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Upload a payment file first
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
