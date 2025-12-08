import React from 'react';

// --- Styles (CSS-in-JS for portability in template) ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  @page {
    size: auto;
    margin: 0mm;
  }

  :root {
    --primary: #3b82f6;       /* Blue 500 */
    --primary-light: #eff6ff; 
    --success: #10b981;       /* Emerald 500 */
    --success-light: #ecfdf5;
    --warning: #f59e0b;       /* Amber 500 */
    --warning-light: #fffbeb;
    --danger: #ef4444;        /* Red 500 */
    --danger-light: #fef2f2;
    --text-main: #f1f5f9;     /* Slate 100 */
    --text-muted: #94a3b8;    /* Slate 400 */
    --bg-page: #0f172a;       /* Slate 900 (Dark Page) */
    --bg-card: #1e293b;       /* Slate 800 (Cards) */
    --border: #334155;        /* Slate 700 */
    --radius: 8px;
  }

  body {
    margin: 0;
    background: var(--bg-page);
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .pdf-container {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 15mm;
    margin: 0 auto;
    background: var(--bg-page);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* --- Header --- */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0px;
  }

  .title-section h1 {
    font-size: 24px;
    font-weight: 800;
    margin: 0;
    color: var(--text-main);
    letter-spacing: -0.5px;
  }

  .title-section p {
    font-size: 11px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-section {
    text-align: right;
  }

  .meta-section .emp-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
  }

  .meta-section .report-date {
    font-size: 11px;
    color: var(--text-muted);
    margin: 2px 0 0 0;
  }

  /* --- Grid Layouts --- */
  .grid-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 15px;
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-main);
  }

  .stat-sub {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* --- Table --- */
  .table-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .table-header {
    padding: 12px 15px;
    border-bottom: 1px solid var(--border);
    background: #1e293b; 
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .table-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    text-transform: uppercase;
  }

  .pro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }

  .pro-table th {
    text-align: left;
    padding: 10px 15px;
    color: var(--text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--border);
    background: #0f172a;
  }

  .pro-table td {
    padding: 8px 15px;
    border-bottom: 1px solid var(--border);
    color: var(--text-main);
    vertical-align: middle;
  }

  .pro-table tr:last-child td {
    border-bottom: none;
  }

  /* --- Row Colors (Subtle Tints) --- */
  .row-promotion { background-color: rgba(16, 185, 129, 0.05); }
  .row-demotion { background-color: rgba(239, 68, 68, 0.05); }
  .row-violation { background-color: rgba(249, 115, 22, 0.05); }
  .row-info { background-color: rgba(59, 130, 246, 0.05); } /* Blue for Info/Early Arrival */

  /* --- Badges/Pills --- */
  .event-flex {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .event-icon {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tier-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    color: white;
  }

  .change-pos { color: var(--success); font-weight: 700; }
  .change-neg { color: var(--danger); font-weight: 700; }
  .change-neutral { color: var(--text-muted); }

  /* --- Footer --- */
  .footer {
    margin-top: auto;
    text-align: center;
    font-size: 9px;
    color: var(--border);
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  /* Print Media Query */
  /* Print Media Query - FORCE LIGHT MODE for readability */
  @media print {
    :root {
      --bg-page: #ffffff;
      --bg-card: #ffffff;
      --text-main: #000000;
      --text-muted: #555555;
      --border: #cccccc;
    }
    body {
      background-color: #ffffff;
      color: #000000;
    }
    .pdf-container {
      background-color: #ffffff !important;
      color: #000000 !important;
      padding: 12mm 15mm !important;
      margin: 0;
      box-shadow: none;
    }
    .card, .table-card {
      background-color: #ffffff !important;
      border: 1px solid #dddddd !important;
      box-shadow: none !important;
    }
    .table-header {
      background-color: #f8f8f8 !important;
      border-bottom: 2px solid #333 !important;
    }
    .pro-table th {
      background-color: #f1f1f1 !important;
      color: #000000 !important;
      border-bottom: 2px solid #333 !important;
    }
    .pro-table td {
      color: #000000 !important;
      border-bottom: 1px solid #ddd !important;
    }
    .stat-value { color: #000000 !important; }
    
    /* Ensure colored text (status) remains visible but readable */
    .stat-value { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    /* Remove dark tints for rows to ensure text is sharp */
    .row-promotion, .row-demotion, .row-violation, .row-info {
        background-color: transparent !important;
    }
  }
`;

const FiveTierTemplate = ({ data }) => {
  if (!data) return null;

  const { employee, state, events } = data;
  const { tier, points, latenessCount, tierStartDate } = state;

  // Helper: Next Reset
  const getNextReset = () => {
    const next = new Date(tierStartDate);
    next.setDate(next.getDate() + 30);
    return next.toLocaleDateString();
  };

  // Helper: Tier Colors (Output hex for CSS usage)
  const getTierColor = (level) => {
    switch (level) {
      case 5: return 'var(--success)';
      case 4: return '#3b82f6'; // Blue
      case 3: return 'var(--warning)';
      case 2: return 'var(--danger)'; // Orange/Red mix in UI usually, using Warning/Danger here
      case 1: return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  // Helper: Row Class
  const getRowClass = (ev) => {
    const t = ev.type || '';
    if (t.includes('promotion')) return 'row-promotion';
    if (t.includes('demotion')) return 'row-demotion';
    if (t.includes('violation')) return 'row-violation';

    // Check specific validation types for Blue tint
    if (ev.violation === 'Early Arrival' || ev.violation === 'Shift Pickup') return 'row-info';
    if (t.includes('reset') || t.includes('freeze')) return 'row-info';

    return '';
  };

  // Helper: Change Text
  const getChangeDisplay = (change) => {
    if (!change || change === 0) return <span className="change-neutral">-</span>;
    if (change > 0) return <span className="change-pos">+{change}</span>;
    return <span className="change-neg">{change}</span>;
  };

  // Event Display Name
  const getEventName = (ev) => {
    if (ev.type === 'violation') return ev.violation || 'Violation';
    return ev.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Helper: Tier Number Display
  const getTierNumber = (tierObj) => {
    if (!tierObj || tierObj.level === undefined) return '-';
    return Math.max(1, 6 - tierObj.level);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pdf-container">

        {/* 1. Header */}
        <header className="header">
          <div className="title-section">
            <h1>5-Tier Policy Analysis</h1>
            <p>Comprehensive Performance & Violation Report</p>
          </div>
          <div className="meta-section">
            <div className="emp-name">{employee.name}</div>
            <div className="report-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </header>

        {/* 2. Summary Cards */}
        <div className="grid-summary">
          {/* Tier */}
          <div className="card">
            <span className="stat-label">Current Status</span>
            <span className="stat-value" style={{ color: getTierColor(tier.level) }}>
              {tier.name}
            </span>
            <span className="stat-sub">Tier {getTierNumber(tier)}</span>
          </div>

          {/* Points */}
          <div className="card">
            <span className="stat-label">Current Points</span>
            <span className="stat-value">{points}</span>
            <span className="stat-sub">Accumulated Total</span>
          </div>

          {/* Reset */}
          <div className="card">
            <span className="stat-label">Next Reset</span>
            <span className="stat-value" style={{ fontSize: '18px' }}>{getNextReset()}</span>
            <span className="stat-sub">Estimated Date</span>
          </div>
        </div>

        {/* 3. Timeline Table */}
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Activity Timeline</span>
          </div>
          <table className="pro-table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Date</th>
                <th style={{ width: '10%' }}>Cycle</th>
                <th style={{ width: '25%' }}>Event</th>
                <th style={{ width: '25%' }}>Details</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Start</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Change</th>
                <th style={{ width: '8%', textAlign: 'center' }}>End</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {events.slice().reverse().map((ev, idx) => (
                <tr key={idx} className={getRowClass(ev)}>
                  <td>
                    {new Date(ev.date).toLocaleDateString()}
                  </td>
                  <td>
                    {ev.cycleStart && (
                      <span style={{ fontWeight: 600, fontSize: '9px' }}>
                        Day {ev.daysInCycle}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="event-flex">
                      {/* Could add icons here if desired, using emoji for simple print safety or SVG if imported */}
                      <span style={{ fontWeight: 600 }}>{getEventName(ev)}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {ev.details}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {ev.startPoints !== undefined ? ev.startPoints : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {getChangeDisplay(ev.change)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {ev.points}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ev.tier && (
                      <span
                        className="tier-badge"
                        style={{ backgroundColor: ev.tier.color || '#ccc' }}
                      >
                        T{getTierNumber(ev.tier)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                    No activity recorded for this employee.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="footer">
          Generated by T-A Policy Manager | Internal Use Only
        </div>

      </div>
    </>
  );
};

export default FiveTierTemplate;
