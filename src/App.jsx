import { useState } from 'react';
import './App.css';

function App() {
  const [samplePercent, setSamplePercent] = useState(10);
  const [startDate, setStartDate] = useState('2024-04-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [internalData, setInternalData] = useState([]);
  const [externalData, setExternalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Demo data arrays
  const DEMO_INTERNAL_DATA = [
    {
      data: {
        uuid: "2b5ddd6e-a78c-b6b9-11b3-9925d6efbe42",
        name: "XIANG",
        mmsi: "413795171",
        type: "Cargo",
        lat: 22.960667,
        lon: 113.50388,
        speed: 0.1,
        heading: 310,
        navigation_status: "Stopped",
        dep_port: "DONG GUAN",
        dest_port: "LIJIANG",
        atd_UTC: "2024-04-11T06:23:00Z",
        eta_UTC: "2024-12-01T02:49:00Z"
      },
      meta: { success: true }
    },
    {
      data: {
        uuid: "2b5ddd6e-a78c-b6b9-11b3-9925d6efbe43",
        name: "YANG",
        mmsi: "413795172",
        type: "Cargo",
        lat: 23.960667,
        lon: 114.50388,
        speed: 1.2,
        heading: 90,
        navigation_status: "Underway",
        dep_port: "NINGBO",
        dest_port: "SHANGHAI",
        atd_UTC: "2024-04-12T06:23:00Z",
        eta_UTC: "2024-12-02T02:49:00Z"
      },
      meta: { success: true }
    },
    {
      data: {
        uuid: "2b5ddd6e-a78c-b6b9-11b3-9925d6efbe44",
        name: "OCEANIC",
        mmsi: "413795173",
        type: "Tanker",
        lat: 24.960667,
        lon: 115.50388,
        speed: 2.5,
        heading: 180,
        navigation_status: "Moored",
        dep_port: "SHENZHEN",
        dest_port: "HONG KONG",
        atd_UTC: "2024-05-01T08:00:00Z",
        eta_UTC: "2024-05-01T12:00:00Z"
      },
      meta: { success: true }
    }
  ];
  const DEMO_EXTERNAL_DATA = [
    {
      data: {
        uuid: "3c6ddd6e-a78c-b6b9-11b3-9925d6efbe42",
        name: "XIANG",
        mmsi: "413795171",
        type: "Cargo",
        lat: 22.960667,
        lon: 113.50388,
        speed: 0.2,
        heading: 310,
        navigation_status: "Stopped",
        dep_port: "DONG GUAN",
        dest_port: "LIJIANG",
        atd_UTC: "2024-04-11T06:23:00Z",
        eta_UTC: "2024-12-01T02:49:00Z"
      },
      meta: { success: true }
    },
    {
      data: {
        uuid: "3c6ddd6e-a78c-b6b9-11b3-9925d6efbe43",
        name: "YANG",
        mmsi: "413795172",
        type: "Cargo",
        lat: 23.960667,
        lon: 114.50388,
        speed: 1.2,
        heading: 90,
        navigation_status: "Underway",
        dep_port: "NINGBO",
        dest_port: "SHANGHAI",
        atd_UTC: "2024-04-12T06:23:00Z",
        eta_UTC: "2024-12-02T02:49:00Z"
      },
      meta: { success: true }
    },
    {
      data: {
        uuid: "3c6ddd6e-a78c-b6b9-11b3-9925d6efbe44",
        name: "OCEANIC",
        mmsi: "413795173",
        type: "Tanker",
        lat: 24.960667,
        lon: 115.50388,
        speed: 2.7,
        heading: 180,
        navigation_status: "Moored",
        dep_port: "SHENZHEN",
        dest_port: "HONG KONG",
        atd_UTC: "2024-05-01T08:00:00Z",
        eta_UTC: "2024-05-01T12:00:00Z"
      },
      meta: { success: true }
    }
  ];

  const fetchSampledData = () => {
    setLoading(true);
    setError('');
    // Calculate sample size based on percentage
    const total = Math.min(DEMO_INTERNAL_DATA.length, DEMO_EXTERNAL_DATA.length);
    const sampleSize = Math.max(1, Math.floor((samplePercent / 100) * total));
    // Simulate sampling from demo data
    setTimeout(() => {
      setInternalData(DEMO_INTERNAL_DATA.slice(0, sampleSize));
      setExternalData(DEMO_EXTERNAL_DATA.slice(0, sampleSize));
      setLoading(false);
    }, 500);
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
