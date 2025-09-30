import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase client setup
const supabaseUrl = 'https://ynmcyukuxwglmxofhuot.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const vesselFinderKey = import.meta.env.VITE_VESSELFINDER_KEY;

const COMMON_FIELDS = [
  { label: 'MMSI', internal: 'mmsi', external: 'MMSI' },
  { label: 'Name', internal: 'name', external: 'NAME' },
  { label: 'Latitude', internal: 'lat', external: 'LATITUDE' },
  { label: 'Longitude', internal: 'lon', external: 'LONGITUDE' },
  { label: 'Speed', internal: 'speed', external: 'SPEED' },
  { label: 'Heading', internal: 'heading', external: 'HEADING' },
  { label: 'Destination', internal: 'dest_port', external: 'DESTINATION' },
  { label: 'ETA', internal: 'eta_UTC', external: 'ETA' }
];

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

  const fetchSampledInternalData = async (sampleSize) => {
    const { data, error } = await supabase
      .from('ships') // Change 'ships' to your table name if needed
      .select('*')
      .limit(sampleSize);
    return data || [];
  };

  const fetchSampledVesselsWithPositions = async (sampleSize, startDate, endDate) => {
    // 1. Sample vessels
    const { data: vessels, error: vesselError } = await supabase
      .from('vessels')
      .select('*')
      .limit(sampleSize);
    if (vesselError) return [];

    // 2. For each vessel, get latest position in date range
    const vesselWithPosition = await Promise.all(
      vessels.map(async vessel => {
        const { data: pos } = await supabase
          .from('positions')
          .select('*')
          .eq('vessel_id', vessel.id)
          .gte('position_time', startDate)
          .lte('position_time', endDate)
          .order('position_time', { ascending: false })
          .limit(1);
        return {
          vessel,
          position: pos?.[0] || null
        };
      })
    );
    return vesselWithPosition;
  };

  const fetchVesselFinderData = async (mmsi) => {
    const url = `https://api.vesselfinder.com/vessels?userkey=${vesselFinderKey}&mmsi=${mmsi}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return data[0]?.AIS || null;
    } catch {
      return null;
    }
  };

  const fetchAndCompare = async () => {
    setLoading(true);
    setError('');
    // 1. Sample vessels with positions
    const sampled = await fetchSampledVesselsWithPositions(samplePercent, startDate, endDate);
    // 2. Fetch VesselFinder data for each MMSI
    const externalSample = await Promise.all(
      sampled.map(({ vessel }) => fetchVesselFinderData(vessel.mmsi))
    );
    // 3. Store joined internal data and external data
    setInternalData(sampled);
    setExternalData(externalSample);
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <h1 style={{ textAlign: 'center', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '1px', marginBottom: '2rem' }}>
        Data Sampling Dashboard
      </h1>
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div className="date-range-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="date-range-label">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div className="slider-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
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
          <button onClick={fetchAndCompare} disabled={loading} style={{ marginLeft: '16px' }}>
            {loading ? 'Sampling...' : 'Sample Data'}
          </button>
        </div>
      </div>
      {error && <div className="error">Error: {error}</div>}
      <div className="data-section">
        <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.7rem', marginBottom: '1.5rem' }}>Ship Comparison</h2>
        {(() => {
          if (internalData.length === 0 && externalData.length === 0) {
            return <div>No data</div>;
          }
          // Only show ships with at least one difference and within date range
          let diffCount = 0;
          // Filter by date range (ATD)
          const filteredInternal = internalData.filter(item => {
            const atd = item.data.atd_UTC ? new Date(item.data.atd_UTC) : null;
            return atd && atd >= new Date(startDate) && atd <= new Date(endDate);
          });
          const rows = filteredInternal.map((internalItem, idx) => {
            const externalItem = externalData.find(e => e.data.mmsi === internalItem.data.mmsi);
            if (!externalItem) return null;
            const hasDiff = COMMON_FIELDS.some(field => (internalItem.data[field.internal] !== externalItem.data[field.external]));
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
                  {COMMON_FIELDS.map(field => {
                    const internalValue = internalItem.data[field.internal];
                    const externalValue = externalItem ? externalItem.data[field.external] : '-';
                    const isDiff = internalValue !== externalValue;
                    return (
                      <div className="vessel-comparison-row" key={field.internal}>
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
        <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.7rem', marginBottom: '1.5rem' }}>Analytics</h2>
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
            return COMMON_FIELDS.some(field => (item.data[field.internal] !== externalItem.data[field.external]));
          }).length}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
