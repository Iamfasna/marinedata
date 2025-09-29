import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase client setup
const supabaseUrl = 'https://ynmcyukuxwglmxofhuot.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const vesselFinderKey = import.meta.env.VITE_VESSELFINDER_KEY;

function App() {
  const [samplePercent, setSamplePercent] = useState(10);
  const [startDate, setStartDate] = useState('2024-04-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [internalData, setInternalData] = useState([]);
  const [externalData, setExternalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch internal data from Supabase
  const fetchInternalData = async () => {
    setLoading(true);
    setError('');
    // Replace 'ships' with your actual table name
    const { data, error } = await supabase
      .from('ships')
      .select('*');
    if (error) {
      setError('Error fetching internal data');
      setLoading(false);
      return;
    }
    setInternalData(data || []);
    setLoading(false);
  };

  // Fetch external data from VesselFinder
  const fetchExternalData = async (params = {}) => {
    setLoading(true);
    setError('');
    // Build query string from params
    const query = new URLSearchParams({ userkey: vesselFinderKey, ...params }).toString();
    const url = `https://api.vesselfinder.com/vessels?${query}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('VesselFinder API error');
      const data = await response.json();
      setExternalData(data.vessels || data || []); // Use data.vessels if present, else data
    } catch (err) {
      setError('Error fetching external data');
    }
    setLoading(false);
  };

  // Example: Fetch both APIs when sampling
  const fetchSampledData = async () => {
    await fetchInternalData();
    await fetchExternalData();
  };

  return (
    <div className="dashboard">
      <h1>Data Sampling Dashboard</h1>
      <div className="slider-section">
        <span className="slider-label">Sample Size (%):</span>
        <input
          type="range"
          min={1}
          max={100}
          value={samplePercent}
          onChange={e => setSamplePercent(Number(e.target.value))}
          className="slider-input"
        />
        <span className="slider-value">{samplePercent}%</span>
        <button onClick={fetchSampledData} disabled={loading} style={{ marginLeft: '16px' }}>
          {loading ? 'Sampling...' : 'Sample Data'}
        </button>
        <span className="slider-label" style={{marginLeft: '2rem'}}>Date Range:</span>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{marginLeft: '0.5rem', marginRight: '0.5rem'}}
        />
        <span>to</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          style={{marginLeft: '0.5rem'}}
        />
      </div>
      {error && <div className="error">Error: {error}</div>}
      <div className="data-section">
        <h2>Ship Comparison</h2>
        {(() => {
          if (internalData.length === 0 && externalData.length === 0) {
            return <div>No data</div>;
          }
          // Only show ships with at least one difference and within date range
          const fields = [
            { label: 'Name', key: 'name' },
            { label: 'MMSI', key: 'mmsi' },
            { label: 'Type', key: 'type' },
            { label: 'Status', key: 'navigation_status' },
            { label: 'Lat', key: 'lat' },
            { label: 'Lon', key: 'lon' },
            { label: 'Speed', key: 'speed' },
            { label: 'Heading', key: 'heading' },
            { label: 'Departure', key: 'dep_port' },
            { label: 'Destination', key: 'dest_port' },
            { label: 'ATD', key: 'atd_UTC' },
            { label: 'ETA', key: 'eta_UTC' }
          ];
          let diffCount = 0;
          // Filter by date range (ATD)
          const filteredInternal = internalData.filter(item => {
            const atd = item.data.atd_UTC ? new Date(item.data.atd_UTC) : null;
            return atd && atd >= new Date(startDate) && atd <= new Date(endDate);
          });
          const rows = filteredInternal.map((internalItem, idx) => {
            const externalItem = externalData.find(e => e.data.mmsi === internalItem.data.mmsi);
            if (!externalItem) return null;
            const hasDiff = fields.some(field => (internalItem.data[field.key] !== externalItem.data[field.key]));
            if (!hasDiff) return null;
            diffCount++;
            return (
              <div key={internalItem.data.uuid} className="vessel-comparison">
                <div className="vessel-comparison-title">🚢 {internalItem.data.name} (MMSI: {internalItem.data.mmsi})</div>
                <div className="vessel-comparison-table four-cols">
                  <div className="vessel-comparison-header">
                    <span>Details</span>
                    <span>Marine Radar</span>
                    <span>Vessel Finder</span>
                    <span>Difference</span>
                  </div>
                  {fields.map(field => {
                    const internalValue = internalItem.data[field.key];
                    const externalValue = externalItem ? externalItem.data[field.key] : '-';
                    const isDiff = internalValue !== externalValue;
                    return (
                      <div className="vessel-comparison-row" key={field.key}>
                        <span className={isDiff ? 'diff-field' : 'vessel-label'}>{field.label}</span>
                        <span className={isDiff ? 'diff' : ''}>{internalValue ?? '-'}</span>
                        <span className={isDiff ? 'diff' : ''}>{externalValue ?? '-'}</span>
                        <span className={isDiff ? 'diff' : 'no-diff'}>{isDiff ? 'Diff' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
          // Error rate calculation
          const errorRate = filteredInternal.length > 0 ? ((diffCount / filteredInternal.length) * 100).toFixed(2) : '0.00';
          // Data accuracy calculation
          const dataAccuracy = (100 - parseFloat(errorRate)).toFixed(2);
          return <>
            {rows.filter(Boolean).length === 0 ? <div>No differences found</div> : rows}
            <div style={{marginTop: '2rem', fontWeight: 600, color: '#b91c1c'}}>Error Rate: {errorRate}%</div>
            <div style={{marginTop: '0.5rem', fontWeight: 700, color: '#2e7d32'}}>Data Accuracy: {dataAccuracy}%</div>
          </>;
        })()}
      </div>

      {/* Analytics Section */}
      <div className="data-section">
        <h2>Analytics</h2>
        <div style={{fontSize: '1.1rem', color: '#222', fontWeight: 600}}>
          <div>Total Ships Compared: {internalData.length}</div>
          <div>Ships in Date Range: {internalData.filter(item => {
            const atd = item.data.atd_UTC ? new Date(item.data.atd_UTC) : null;
            return atd && atd >= new Date(startDate) && atd <= new Date(endDate);
          }).length}</div>
          <div>Differences Found: {internalData.filter(item => {
            const atd = item.data.atd_UTC ? new Date(item.data.atd_UTC) : null;
            if (!(atd && atd >= new Date(startDate) && atd <= new Date(endDate))) return false;
            const externalItem = externalData.find(e => e.data.mmsi === item.data.mmsi);
            if (!externalItem) return false;
            const fields = [
              'name','mmsi','type','navigation_status','lat','lon','speed','heading','dep_port','dest_port','atd_UTC','eta_UTC'
            ];
            return fields.some(field => (item.data[field] !== externalItem.data[field]));
          }).length}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
