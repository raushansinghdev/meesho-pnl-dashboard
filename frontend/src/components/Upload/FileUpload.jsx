import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadPaymentFile, uploadOrdersFile } from '../../api/client';

/**
 * FileUpload — Drag-and-drop upload for payment file (.xlsx) and orders CSV.
 */
export default function FileUpload({ onPaymentUploaded, onOrdersUploaded }) {
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [ordersStatus, setOrdersStatus] = useState(null);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(null); // 'payment' | 'orders' | null

  const handlePaymentUpload = useCallback(async (file) => {
    setPaymentStatus('uploading');
    setError(null);
    try {
      const meta = await uploadPaymentFile(file);
      setPaymentMeta(meta);
      setPaymentStatus('success');
      onPaymentUploaded?.(meta);
    } catch (err) {
      setError(err.message);
      setPaymentStatus('error');
    }
  }, [onPaymentUploaded]);

  const handleOrdersUpload = useCallback(async (file) => {
    setOrdersStatus('uploading');
    setError(null);
    try {
      const meta = await uploadOrdersFile(file);
      setOrdersStatus('success');
      onOrdersUploaded?.(meta);
    } catch (err) {
      setError(err.message);
      setOrdersStatus('error');
    }
  }, [onOrdersUploaded]);

  const handleDrop = (e, type) => {
    e.preventDefault();
    setDragActive(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (type === 'payment') handlePaymentUpload(file);
    else handleOrdersUpload(file);
  };

  const handleFileInput = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'payment') handlePaymentUpload(file);
    else handleOrdersUpload(file);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
      {/* Payment File Upload */}
      <div>
        <div style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <FileSpreadsheet size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600 }}>Payment File</span>
          <span className="badge badge--info">Required</span>
        </div>

        <label
          className={`upload-zone ${dragActive === 'payment' ? 'upload-zone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive('payment'); }}
          onDragLeave={() => setDragActive(null)}
          onDrop={(e) => handleDrop(e, 'payment')}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFileInput(e, 'payment')}
          />

          {paymentStatus === 'uploading' ? (
            <>
              <Loader size={32} className="upload-zone__icon" style={{ animation: 'spin 1s linear infinite' }} />
              <div className="upload-zone__title">Uploading & parsing...</div>
            </>
          ) : paymentStatus === 'success' ? (
            <>
              <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: 'var(--space-4)' }} />
              <div className="upload-zone__title" style={{ color: 'var(--success)' }}>Uploaded Successfully</div>
              <div className="upload-zone__subtitle">
                {paymentMeta?.payment_window_start} → {paymentMeta?.payment_window_end} · {paymentMeta?.order_count} orders
              </div>
            </>
          ) : (
            <>
              <Upload size={32} className="upload-zone__icon" />
              <div className="upload-zone__title">Drop payment file here</div>
              <div className="upload-zone__subtitle">
                Meesho *_PAYMENT_FILE_*.xlsx — the source of truth for P&L
              </div>
            </>
          )}
        </label>
      </div>

      {/* Orders CSV Upload */}
      <div>
        <div style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontWeight: 600 }}>Orders CSV</span>
          <span className="badge badge--estimated">Optional</span>
        </div>

        <label
          className={`upload-zone ${dragActive === 'orders' ? 'upload-zone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive('orders'); }}
          onDragLeave={() => setDragActive(null)}
          onDrop={(e) => handleDrop(e, 'orders')}
        >
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFileInput(e, 'orders')}
          />

          {ordersStatus === 'uploading' ? (
            <>
              <Loader size={32} className="upload-zone__icon" style={{ animation: 'spin 1s linear infinite' }} />
              <div className="upload-zone__title">Uploading...</div>
            </>
          ) : ordersStatus === 'success' ? (
            <>
              <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: 'var(--space-4)' }} />
              <div className="upload-zone__title" style={{ color: 'var(--success)' }}>Uploaded</div>
              <div className="upload-zone__subtitle">Pending orders will be shown on the dashboard</div>
            </>
          ) : (
            <>
              <Upload size={32} className="upload-zone__icon" />
              <div className="upload-zone__title">Drop orders CSV here</div>
              <div className="upload-zone__subtitle">
                Meesho Orders_*.csv — only for pending-order visibility, not P&L
              </div>
            </>
          )}
        </label>
      </div>

      {error && (
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'var(--danger-muted)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--danger)',
          fontSize: 'var(--text-sm)',
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
