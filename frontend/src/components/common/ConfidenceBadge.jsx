import { ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * ConfidenceBadge — visual indicator of data reliability.
 *
 * Per README §5: revenue/ads figures are "bank-verified" (proven to match
 * HDFC statement to the paisa), while COGS/profit figures depend on
 * seller-reported costs and policy-based loss assumptions.
 */
export default function ConfidenceBadge({ type = 'verified' }) {
  if (type === 'verified') {
    return (
      <span className="badge badge--verified tooltip-wrapper">
        <ShieldCheck size={12} />
        Bank-verified
        <span className="tooltip-content">
          This figure matches your bank statement to the paisa (§4 of the methodology).
        </span>
      </span>
    );
  }

  return (
    <span className="badge badge--estimated tooltip-wrapper">
      <AlertTriangle size={12} />
      Seller-reported
      <span className="tooltip-content">
        This depends on your cost entries and loss-rate assumptions — not independently verified.
      </span>
    </span>
  );
}
