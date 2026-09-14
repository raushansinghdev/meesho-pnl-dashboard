import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadPaymentFile, uploadOrdersFile, importCostsFromExcel, exportCostsToExcel, getCurrentPaymentFileMeta } from '../../api/client';
import * as XLSX from 'xlsx';

/**
 * FileUpload — Compact drag-and-drop upload for payment file (.xlsx) and orders CSV.
 */
export default function FileUpload({ onPaymentUploaded, onOrdersUploaded, onCostsUploaded }) {
  const existingMeta = getCurrentPaymentFileMeta();
  const [paymentStatus, setPaymentStatus] = useState(existingMeta ? 'success' : null);
  const [ordersStatus, setOrdersStatus] = useState(null);
  const [paymentMeta, setPaymentMeta] = useState(existingMeta);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(null);

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
    else if (type === 'orders') handleOrdersUpload(file);
    else handleCostsUpload(file);
  };

  const handleFileInput = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'payment') handlePaymentUpload(file);
    else if (type === 'orders') handleOrdersUpload(file);
    else handleCostsUpload(file);
  };

  const renderZone = (type, status, meta) => {
    const isPayment = type === 'payment';
    const Icon = isPayment ? FileSpreadsheet : FileText;

    return (
      <label
        className={`upload-zone ${dragActive === type ? 'upload-zone--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(type); }}
        onDragLeave={() => setDragActive(null)}
        onDrop={(e) => handleDrop(e, type)}
      >
        <input
          type="file"
          accept={isPayment ? '.xlsx,.xls' : '.csv'}
          style={{ display: 'none' }}
          onChange={(e) => handleFileInput(e, type)}
        />

        {status === 'uploading' ? (
          <>
            <Loader size={24} className="upload-zone__icon" style={{ animation: 'spin 1s linear infinite' }} />
            <div className="upload-zone__title">Processing...</div>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle size={24} style={{ color: 'var(--success)', marginBottom: 'var(--space-2)' }} />
            <div className="upload-zone__title" style={{ color: 'var(--success)' }}>
              {isPayment ? 'Uploaded' : 'Uploaded'}
            </div>
            {isPayment && meta && (
              <div className="upload-zone__subtitle">
                {meta.file_name ? meta.file_name : 'File parsed successfully'}
              </div>
            )}
          </>
        ) : (
          <>
            <Upload size={24} className="upload-zone__icon" />
            <div className="upload-zone__title">
              {type === 'payment' ? 'Drop payment file' : type === 'orders' ? 'Drop orders CSV' : 'Drop costs Excel'}
            </div>
            <div className="upload-zone__subtitle">
              {type === 'payment' ? '*_PAYMENT_FILE_*.xlsx' : type === 'orders' ? 'Orders_*.csv (optional)' : 'sku_costs.xlsx'}
            </div>
          </>
        )}
      </label>
    );
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)' }}>
        {/* Payment */}
        <div>
          <div style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileSpreadsheet size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Payment File</span>
            <span className="badge badge--verified" style={{ fontSize: '0.65rem' }}>Required</span>
          </div>
          {renderZone('payment', paymentStatus, paymentMeta)}
        </div>

        {/* Orders */}
        <div>
          <div style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Orders CSV</span>
            <span className="badge badge--estimated" style={{ fontSize: '0.65rem' }}>Optional</span>
          </div>
          {renderZone('orders', ordersStatus, null)}
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--danger-muted)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          fontSize: 'var(--text-sm)',
          marginTop: 'var(--space-3)',
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
