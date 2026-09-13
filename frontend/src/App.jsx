import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import SKUCostsPage from './pages/SKUCostsPage';
import SettingsPage from './pages/SettingsPage';

/**
 * App — Root component with routing and shared state.
 *
 * Global state is lifted here (not in a store) because the app is simple:
 * - pnlData: the latest computed P&L result
 * - lossRates: current loss-rate settings
 */
export default function App() {
  const [pnlData, setPnlData] = useState(null);
  const [lossRates, setLossRates] = useState({
    rto: 0.0,
    returnRate: 1.0,
    lost: 1.0,
    unresolved: 0.0,
  });

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage pnlData={pnlData} />} />
          <Route
            path="/upload"
            element={
              <UploadPage
                lossRates={lossRates}
                setLossRates={setLossRates}
                onPnLComputed={setPnlData}
              />
            }
          />
          <Route path="/sku-costs" element={<SKUCostsPage />} />
          <Route
            path="/settings"
            element={<SettingsPage lossRates={lossRates} onChange={setLossRates} />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
