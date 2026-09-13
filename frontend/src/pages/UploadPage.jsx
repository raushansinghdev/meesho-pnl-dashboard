import { useState } from 'react';
import { Upload, Play, Loader, CheckCircle } from 'lucide-react';
import FileUpload from '../components/Upload/FileUpload';
import LossRates from '../components/Settings/LossRates';
import { computePnL } from '../api/client';

export default function UploadPage({ lossRates, setLossRates, onPnLComputed }) {
  const [paymentFileId, setPaymentFileId] = useState(null);
  const [ordersFileId, setOrdersFileId] = useState(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const [computed, setComputed] = useState(false);

  const handleCompute = async () => {
    if (!paymentFileId) return;
    setComputing(true);
    setError(null);
    setComputed(false);

    try {
      const result = await computePnL(paymentFileId, ordersFileId, lossRates);
      onPnLComputed(result);
      setComputed(true);
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
          <Upload size={24} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)', color: 'var(--accent)' }} />
          Upload & Compute
        </h1>
        <p className="page-header__subtitle">
          Upload your Meesho exports, set loss rates, and compute your realized P&L
        </p>
      </div>

      <div className="page-body">
        {/* Step 1: File Uploads */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="section-title">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
            }}>1</span>
            Upload Files
          </div>
          <FileUpload
            onPaymentUploaded={(meta) => setPaymentFileId(meta.file_id)}
            onOrdersUploaded={(meta) => setOrdersFileId(meta.file_id)}
          />
        </div>

        {/* Step 2: Loss Rate Config */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="section-title">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
            }}>2</span>
            Loss Rate Assumptions
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            These control what fraction of COGS is charged for each order outcome.
            Defaults match your current CLI settings.
          </p>
          <LossRates lossRates={lossRates} onChange={setLossRates} />
        </div>

        {/* Step 3: Compute */}
        <div className="card">
          <div className="section-title">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
            }}>3</span>
            Compute P&L
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              background: 'var(--danger-muted)',
              color: 'var(--danger)',
              fontSize: 'var(--text-sm)',
            }}>
              {error}
            </div>
          )}

          {computed && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              background: 'var(--success-muted)',
              color: 'var(--success)',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <CheckCircle size={16} />
              P&L computed successfully! Head to the Dashboard to see your results.
            </div>
          )}

          <button
            className="btn btn--primary btn--lg"
            onClick={handleCompute}
            disabled={!paymentFileId || computing}
            style={{ width: '100%' }}
          >
            {computing ? (
              <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Computing P&L...</>
            ) : (
              <><Play size={18} /> Compute Realized P&L</>
            )}
          </button>

          {!paymentFileId && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
              Upload a payment file first to enable computation.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
