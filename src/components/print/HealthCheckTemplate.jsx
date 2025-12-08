import React from 'react';

// --- Styles (CSS-in-JS for portability in template) ---
// --- Styles (CSS-in-JS for portability in template) ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  :root {
    --primary: #2563eb;       /* Stronger Blue */
    --primary-light: #eff6ff;
    --success: #059669;       /* Emerald 600 */
    --success-light: #ecfdf5;
    --warning: #d97706;       /* Amber 600 */
    --warning-light: #fffbeb;
    --danger: #dc2626;        /* Red 600 */
    --danger-light: #fef2f2;
    --text-main: #1e293b;     /* Slate 800 */
    --text-muted: #64748b;    /* Slate 500 */
    --bg-page: #ffffff;
    --bg-card: #ffffff;
    --border: #e2e8f0;        /* Slate 200 */
    --radius: 8px;
  }

  /* Print Specifics */
  @page {
    margin: 0;
    size: auto;
  }

  @media print {
    body { background: white; }
    .pdf-container {
      margin: 0;
      width: 100%;
      height: auto; /* Allow growth */
      padding: 12mm 15mm;
      box-shadow: none;
      overflow: visible; /* CRITICAL: Allow pages to flow */
    }
    .loading-overlay { display: none !important; }
    
    /* Force page break */
    .page-break {
        page-break-before: always;
        break-before: page;
        display: block;
        height: 0; 
        overflow: hidden;
    }

    /* Print Badge Fix - Use border instead of solid block to avoid 'black box' issues */
    .tier-badge {
        background: white !important;
        color: var(--text-main) !important;
        border: 2px solid var(--text-main) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
  }

  body {
    margin: 0;
    background: #f1f5f9; /* Light Slate background for screen */
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
    background: white;
    box-sizing: border-box;
    position: relative;
    /* overflow: hidden; Removed to allow page breaks */
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end; /* Align bottom */
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid var(--text-main); /* Stronger separator */
  }

  .title-group h1 {
    font-size: 20px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    margin: 0 0 2px 0;
    color: var(--text-main);
  }

  .title-group p {
    margin: 0;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Layout Grid */
  .grid-hero {
    display: grid;
    grid-template-columns: 1.4fr 1fr; /* Health takes more space */
    gap: 15px;
    margin-bottom: 15px;
  }
  
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
  }

  /* Cards */
  .card {
     background: var(--bg-card);
     border: 1px solid var(--border);
     border-radius: var(--radius);
     padding: 15px;
     position: relative;
  }
  
  .card.featured {
     background: #f8fafc; /* Very subtle slate tint */
     border-color: #cbd5e1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  /* Tier Health Redesign */
  .tier-display {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 12px;
  }
  .tier-badge {
    background: var(--text-main);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.02em;
    border: 2px solid transparent; /* Placeholder for layout stability */
  }
  .tier-info h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
  }
  .tier-info p {
    margin: 2px 0 0 0;
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Health Bar Pro - Segmented */
  .health-segments-container {
      display: flex;
      gap: 6px; /* Space between segments */
      margin-top: 5px;
      height: 12px;
  }
  .health-segment-box {
      flex: 1;
      border-radius: 3px;
      background: #e2e8f0; /* Empty state */
      transition: background 0.3s;
  }
  
  .health-markers {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    padding: 0 2px;
    position: relative; /* For arrow positioning */
  }
  .marker {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  
  /* Trend Arrow */
  .trend-arrow {
      font-weight: 900;
      font-size: 16px; /* Larger and visible */
      letter-spacing: 2px;
      line-height: 1;
  }

  /* Metric Big */
  .metric-value {
    font-size: 32px;
    font-weight: 800;
    color: var(--text-main);
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .metric-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* AI Summary Box */
  .ai-box {
    background: var(--primary-light);
    border: 1px solid #bfdbfe;
    border-radius: var(--radius);
    padding: 15px;
    margin-bottom: 15px;
  }
  .ai-title {
    color: var(--primary);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ai-content {
    font-size: 12px;
    line-height: 1.5;
    color: #334155;
  }

  /* Tables Professional */
  .pro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .pro-table th {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
  }
  .pro-table td {
    padding: 8px;
    border-bottom: 1px solid #f1f5f9;
    color: var(--text-main);
    font-weight: 500;
    vertical-align: middle;
  }
  .pro-table tr:last-child td { border-bottom: none; }

  /* Pill Tags */
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .pill.stable { background: var(--success-light); color: var(--success); }
  .pill.risk { background: var(--warning-light); color: var(--warning); }
  .pill.danger { background: var(--danger-light); color: var(--danger); }

  /* Policy Second Page */
  .policy-page {
      padding-top: 20px;
  }
  .policy-header {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--text-main);
  }
  .policy-content-list {
      list-style: none;
      padding: 0;
      margin: 0;
  }
  .policy-content-list li {
      margin-bottom: 12px;
      font-size: 11px;
      line-height: 1.5;
      color: #334155;
      display: flex;
      gap: 10px;
  }
  .policy-number {
      font-weight: 700;
      color: var(--primary);
      min-width: 15px;
  }
`;

// --- Components ---
// --- Components ---
const HealthBarPro = ({ tier, pointsLost30d, forecast, hasRecentViolation }) => {
  // 5 Segments: Good, Good, Edu, Coach, Severe/Final
  // Tier 1 -> 5 bars
  // Tier 2 -> 4 bars
  // ...
  const currentHealth = 5 - tier.statusLevelIndex;

  // Determine active color
  let activeColor = 'var(--success)';
  if (currentHealth <= 3) activeColor = 'var(--warning)';
  if (currentHealth <= 1) activeColor = 'var(--danger)';

  const segments = [1, 2, 3, 4, 5];

  // Trend Arrow Logic
  // BAD (Red, Left <-): If points lost > 0 OR recent violation
  // GOOD (Green, Right ->): If no points lost AND no recent violation

  let trendArrow = "->"; // Default good
  let arrowColor = "var(--success)";

  // Check Bad Trend Context
  if (pointsLost30d > 0 || hasRecentViolation) {
    arrowColor = "var(--danger)";
    // Calc intensity
    if (pointsLost30d > 11) trendArrow = "<---";
    else if (pointsLost30d > 6) trendArrow = "<--";
    else trendArrow = "<-";
  } else {
    // Good Trend Context
    arrowColor = "var(--success)";

    // Promotion Momentum
    // 1-4 days -> "-->"
    // 5-7 days -> "->"
    // Else -> "->"
    const days = forecast ? forecast.daysToPromotion : 999;

    if (days >= 1 && days <= 4) {
      trendArrow = "-->";
    } else {
      trendArrow = "->";
    }
  }

  return (
    <div style={{ padding: '0 2px' }}>
      {/* Arrow Above Bar - Centered */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '5px',
        height: '20px',
        alignItems: 'flex-end'
      }}>
        <span
          className="trend-arrow"
          style={{
            color: arrowColor,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact'
          }}
        >
          {trendArrow}
        </span>
      </div>

      <div className="health-segments-container">
        {segments.map((s) => {
          const isActive = s <= currentHealth;
          return (
            <div
              key={s}
              className="health-segment-box"
              style={{
                background: isActive ? activeColor : '#e2e8f0',
                opacity: isActive ? 1 : 0.4,
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact'
              }}
            />
          );
        })}
      </div>
      <div className="health-markers">
        <span className="marker">Tier 5 (Risk)</span>
        <span className="marker">Tier 3</span>
        <span className="marker">Tier 1 (Safe)</span>
      </div>
    </div>
  );
};

const HealthCheckTemplate = ({ data }) => {
  if (!data) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Generating Report...</div>;

  const { meta, employeeStatus, forecast, cycleData, activityData, aiContext } = data;
  const { reportDate } = meta;

  // Logic Helpers
  // Logic Helpers
  const daConfig = [
    { name: 'Educational', label: 'Verbal Counseling', severity: 1 },
    { name: 'Coaching', label: 'Written Warning', severity: 2 },
    { name: 'Severe', label: 'Severe Warning', severity: 3 },
    { name: 'Final', label: 'Final Warning', severity: 4 },
    { name: 'Termination', label: 'Termination', severity: 5 }
  ];

  const getDaConfig = (name) => daConfig.find(d => name?.includes(d.name)) || null;

  const getTierDisplayName = (name) => {
    if (!name) return "Unknown";
    if (name.includes('Good') || name.includes('Standing')) return 'Tier 1';
    if (name.includes('Education')) return 'Tier 2';
    if (name.includes('Coaching')) return 'Tier 3';
    if (name.includes('Severe')) return 'Tier 4';
    if (name.includes('Final')) return 'Tier 5';
    return name;
  }

  // STICKY DA LOGIC
  const getStickyStatus = (tierName, daList) => {
    // If Tier 1, always Good Standing (Reset)
    if (tierName.includes('Good') || tierName.includes('Standing')) {
      return { label: 'Good Standing', severity: 0 };
    }

    // Otherwise, find highest DA severity in history
    // Note: Assumes daList contains only valid DAs for the current cycle
    if (!daList || daList.length === 0) {
      // Fallback if no DAs found but not Tier 1 (shouldn't happen often in this model)
      // Map tier name directly to base intent
      const tierConfig = getDaConfig(tierName);
      return tierConfig || { label: 'Policy Violation', severity: 0 };
    }

    // Find max severity
    let maxSeverity = 0;
    let highestDA = null;

    daList.forEach(da => {
      const cfg = getDaConfig(da.tier); // da.tier has the name like "Educational"
      if (cfg && cfg.severity > maxSeverity) {
        maxSeverity = cfg.severity;
        highestDA = cfg;
      }
    });

    return highestDA || { label: 'Good Standing', severity: 0 };
  };

  const currentTierDisplay = getTierDisplayName(employeeStatus.currentTierName);

  // Calculate Sticky Status
  const stickyStatus = getStickyStatus(employeeStatus.currentTierName, cycleData.currentCycleDAs);
  const tierDesc = stickyStatus.label;

  // Calculate Next Risk Step
  const getNextRisk = (currentSeverity) => {
    const nextSeverity = currentSeverity + 1;
    const nextConfig = daConfig.find(d => d.severity === nextSeverity);
    return nextConfig ? nextConfig.label : 'Termination';
  };

  const nextRiskLabel = getNextRisk(stickyStatus.severity);

  // Calculate Next Tier Label (e.g. Tier 2 -> Tier 3)
  const currentTierNum = parseInt(currentTierDisplay.replace('Tier ', '')) || 0;
  const nextTierLabel = currentTierNum > 0 && currentTierNum < 5
    ? `Tier ${currentTierNum + 1}`
    : (currentTierNum === 5 ? 'Termination' : 'Unknown');

  const promotionTarget = currentTierNum > 1 ? `Tier ${currentTierNum - 1}` : "Max Tier";

  const drops = cycleData ? cycleData.dropsFromTier1 : 0;
  const isFreezeRisk = drops >= 2;

  const violationsData = activityData.violationsList60d || [];
  const historyData = cycleData && cycleData.cycleHistory ? cycleData.cycleHistory : [];
  const daList = cycleData && cycleData.currentCycleDAs ? cycleData.currentCycleDAs : [];

  // Calculate Points Lost in Last 30 Days for Arrow Trend
  // Assuming 'points' property exists in violations. If not, this defaults to 0 (stable arrow).
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const pointsLost30d = violationsData.reduce((acc, v) => {
    if (new Date(v.date) >= thirtyDaysAgo) {
      return acc + (v.points || 0); // Need points on violation object
    }
    return acc;
  }, 0);

  // Check for ANY violation in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const hasRecentViolation = violationsData.some(v => new Date(v.date) >= sevenDaysAgo);

  return (
    <>
      <style>{styles}</style>
      <div className="pdf-container">

        {/* 1. Header */}
        <div className="header">
          <div className="title-group">
            <p>Employee Health Check</p>
            <h1>{aiContext.name}</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>Report Date</p>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
              {new Date(reportDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* 2. Hero Status Section */}
        <div className="grid-hero">
          {/* Left: Overall Health */}
          <div className="card featured">
            <div className="card-label">Overall Status</div>
            <div style={{ height: '10px' }}></div>
            <div className="tier-display">
              <div className="tier-badge" style={{
                background: currentTierDisplay === 'Tier 1' ? 'var(--success)' :
                  currentTierDisplay === 'Tier 5' ? 'var(--danger)' : 'var(--text-main)'
              }}>
                {currentTierDisplay}
              </div>
              <div className="tier-info">
                <h2>{tierDesc}</h2>
                <p>Current policy standing.</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px', padding: '0 2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Health Trend</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                {employeeStatus.emdPercentage}% Meal Benefit
              </span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <HealthBarPro
                tier={employeeStatus}
                pointsLost30d={pointsLost30d}
                forecast={forecast}
                hasRecentViolation={hasRecentViolation}
              />
            </div>

            {/* DA Explanation & Pipeline */}
            <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
                <strong>DA Logic:</strong> Every tier drop triggers the next level of Disciplinary Action. Moving up a tier does not reset your status unless you reach <strong>Tier 1 (Good Standing)</strong>, which clears your DA status.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', fontWeight: '600', color: 'var(--text-main)' }}>
                <span style={{ color: '#3b82f6' }}>Educational</span>
                <span>→</span>
                <span style={{ color: '#eab308' }}>Coaching</span>
                <span>→</span>
                <span style={{ color: '#f97316' }}>Severe</span>
                <span>→</span>
                <span style={{ color: '#ef4444' }}>Final</span>
                <span>→</span>
                <span style={{ color: 'var(--text-main)' }}>Termination</span>
              </div>
            </div>
          </div>

          {/* Right: Forecast */}
          <div className="card">
            <div className="card-header">
              <span className="card-label">Promotion Forecast</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '85%', gap: '15px' }}>
              {/* Gauge Visual */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                border: '4px solid var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                <div style={{
                  textAlign: 'center', color: 'var(--primary)', fontWeight: '800', fontSize: '24px', lineHeight: 1
                }}>
                  {currentTierDisplay === 'Tier 1'
                    ? <span style={{ fontSize: '16px' }}>MAX</span>
                    : (forecast.daysToPromotion > 0 ? forecast.daysToPromotion : "✓")
                  }
                </div>
                {/* Label below number inside circle */}
                {currentTierDisplay !== 'Tier 1' && forecast.daysToPromotion > 0 &&
                  <div style={{ position: 'absolute', bottom: '18px', fontSize: '8px', fontWeight: '600', color: 'var(--text-muted)' }}>DAYS</div>
                }
              </div>

              {/* Promotion Target Label */}
              {currentTierDisplay !== 'Tier 1' && (
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', marginTop: '-10px', marginBottom: '5px' }}>
                  To {promotionTarget}
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>Risk Scenario</div>
                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--danger)' }}>
                  Drop to {nextTierLabel}<br />
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>({nextRiskLabel})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI Analysis */}
        <div className="ai-box">
          <div className="ai-title">
            <span>✦</span> Performance Analysis
          </div>
          <div className="ai-content">
            {aiContext.summary || "No performance summary available for this period."}
          </div>
        </div>

        {/* 4. Details Grid */}
        <div className="grid-2">
          {/* Freeze Watch */}
          <div className="card" style={{ borderColor: isFreezeRisk ? 'var(--danger)' : 'var(--border)' }}>
            <div className="card-header">
              <span className="card-label" style={{ color: isFreezeRisk ? 'var(--danger)' : 'var(--text-muted)' }}>
                Freeze Watch {isFreezeRisk && '⚠️'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="metric-value" style={{ color: isFreezeRisk ? 'var(--danger)' : 'var(--text-main)' }}>{drops}</span>
              <span className="metric-label" style={{ fontSize: '14px' }}>/ 3 Drops</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
              {isFreezeRisk
                ? "Warning: One more drop will freeze promotion eligibility for 90 days."
                : "Policy: Each drop from Tier 1 counts as 1 strike. On the 3rd strike within a year, you are frozen in your current lower tier. You can only move down the tier list for 90 days not up."}
            </div>
          </div>

          {/* Recent Violations Overview */}
          <div className="card">
            <div className="card-header">
              <span className="card-label">Recent Activity (60d)</span>
            </div>
            {violationsData.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>No recent violations.</div>
            ) : (
              <table className="pro-table">
                <tbody>
                  {violationsData.slice(0, 3).map((v, i) => (
                    <tr key={i}>
                      <td>{new Date(v.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                      <td style={{ fontWeight: 600 }}>{v.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {violationsData.length > 3 && <div style={{ fontSize: '9px', textAlign: 'center', marginTop: '5px', color: 'var(--text-muted)' }}>+ {violationsData.length - 3} more</div>}
          </div>
        </div>

        {/* 5. Full Tables Grid */}
        <div className="grid-2">
          {/* Cycle History */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 15px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <span className="card-label">History Log</span>
            </div>
            <table className="pro-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {historyData.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '15px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)' }}>No history available.</td></tr>
                ) : (
                  historyData.map((h, i) => (
                    <tr key={i}>
                      <td>{new Date(h.date).toLocaleDateString()}</td>
                      <td><span className={`pill ${h.type === 'Drop' ? 'danger' : 'stable'}`}>{h.type}</span></td>
                      <td>{getTierDisplayName(h.tier || h.tierName)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Active DAs */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 15px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <span className="card-label">Disciplinary Actions</span>
            </div>
            <table className="pro-table">
              <tbody>
                {daList.length === 0 ? (
                  <tr><td colSpan="2" style={{ padding: '15px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)' }}>No active actions.</td></tr>
                ) : (
                  daList.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--warning)', paddingLeft: '15px' }}>{d.tier}</td>
                      <td>{new Date(d.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page Break for Policy */}
        <div className="page-break"></div>

        {/* 6. Full Policy Page */}
        <div className="policy-page">
          <div className="policy-header">Company Policy Agreement</div>
          <ul className="policy-content-list">
            <li>
              <span className="policy-number">1.</span>
              <span><strong>Shift Attendance:</strong> All employees are expected to show up to their scheduled shifts posted in 7Shifts, which are updated once per week.</span>
            </li>
            <li>
              <span className="policy-number">2.</span>
              <span><strong>Punctuality:</strong> Employees must attend their scheduled shifts on time.</span>
            </li>
            <li>
              <span className="policy-number">3.</span>
              <span><strong>Schedule Check:</strong> Employees are responsible for checking 7Shifts weekly to view their schedule.</span>
            </li>
            <li>
              <span className="policy-number">4.</span>
              <span><strong>Availability Updates:</strong> Employees must update their availability in 7Shifts for the upcoming week (Wednesday – Tuesday) before Friday at noon if needed.</span>
            </li>
            <li>
              <span className="policy-number">5.</span>
              <span><strong>Running Late:</strong> Employees must notify the store 20 minutes before their scheduled shift if they are running late.</span>
            </li>
            <li>
              <span className="policy-number">6.</span>
              <span><strong>Shift Coverage:</strong> Employees must find coverage if they cannot attend their shift, except in cases of family emergencies or illness. Finding coverage protects against point deduction.</span>
            </li>
            <li>
              <span className="policy-number">7.</span>
              <span><strong>Illness Notification:</strong> Employees must CALL and notify the store by 8:30 a.m. on the same day of their shift if they have fallen ill. This must be done for each scheduled shift.</span>
            </li>
            <li>
              <span className="policy-number">8.</span>
              <span><strong>Emergency Notification:</strong> In the event of a family emergency or loss, employees must CALL the General Manager directly as soon as notified.</span>
            </li>
            <li>
              <span className="policy-number">9.</span>
              <span><strong>Time-Off Requests:</strong> Employees must request time off 12 days before the date and enter it into 7Shifts. If the deadline is missed but the schedule is not yet posted, they may ask the General Manager for time off but it can be denied if it leaves the store vulnerable.</span>
            </li>
            <li>
              <span className="policy-number">10.</span>
              <span><strong>Coverage Protection:</strong> If you callout and find coverage you will not be deducted.</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default HealthCheckTemplate;
