// file path: frontend/src/components/RankingDashboard.jsx
import { useState, useEffect, useMemo } from 'react';

export default function RankingDashboard({ activeTab, setActiveTab }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States for Table
  const [sortConfig, setSortConfig] = useState({ key: 'hist_pct_alpha_1y', direction: 'desc' });
  
  // States for the new Sub-navigation
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'histogram' | 'quadrants'
  const [histMetric, setHistMetric] = useState('avg_alpha_5y');
  const [quadSetup, setQuadSetup] = useState('5y'); // '5y' | '1y'

  // State to track hidden outliers
  const [hiddenTickers, setHiddenTickers] = useState([]);

  // States for dynamic timestamps
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [hoursUntilNext, setHoursUntilNext] = useState(0);

  // PRODUCTION API FETCH
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    fetch(`${API_URL}/rankings`)
      .then(res => { if (!res.ok) throw new Error("API unreachable"); return res.json(); })
      .then(data => { setRankings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Calculate Next Update Time (Weekdays at 9:15 PM)
  useEffect(() => {
    const now = new Date();
    
    // Format "Most recent update" as MM/DD/YYYY
    const formattedDate = now.toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });
    setLastUpdateDate(formattedDate);

    // Calculate hours until next 9:15 PM
    const target = new Date();
    target.setHours(21, 15, 0, 0); // 9:15 PM local time

    if (now > target) {
      target.setDate(target.getDate() + 1); // Push to tomorrow
    }
    
    // Skip weekends (6 = Saturday, 0 = Sunday)
    if (target.getDay() === 6) target.setDate(target.getDate() + 2); // Sat -> Mon
    if (target.getDay() === 0) target.setDate(target.getDate() + 1); // Sun -> Mon

    const diffHours = Math.max(1, Math.round((target - now) / (1000 * 60 * 60)));
    setHoursUntilNext(diffHours);
  }, []);

  // Filtered data for visualizations
  const visibleRankings = useMemo(() => {
    return rankings.filter(r => !hiddenTickers.includes(r.ticker));
  }, [rankings, hiddenTickers]);

  // Table Sorting Logic
  const sortedRankings = useMemo(() => {
    let items = [...rankings];
    if (sortConfig !== null) {
      items.sort((a, b) => {
        const { key, direction } = sortConfig;
        if (key === 'ticker') return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
        return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
      });
    }
    return items;
  }, [rankings, sortConfig]);

  const requestSort = (key) => {
    let direction = sortConfig && sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    setSortConfig({ key, direction });
  };

  const HeaderButton = ({ label, field, align = "right" }) => {
    const isActive = sortConfig?.key === field;
    return (
      <th className={`px-4 py-3 text-${align}`}>
        <button onClick={() => requestSort(field)} className={`font-bold transition-colors hover:text-blue-600 ${isActive ? 'text-blue-600 underline decoration-2 underline-offset-4' : 'text-slate-600'}`}>
          {label} <span className="text-xs ml-1 opacity-60">{isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    );
  };

  // --- HISTOGRAM RENDERER ---
  const renderHistogram = () => {
    const data = [...visibleRankings].sort((a, b) => a[histMetric] - b[histMetric]);
    if (data.length === 0) return null;

    const maxAbs = Math.max(...data.map(d => Math.abs(d[histMetric])));

    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex gap-2 mb-4 justify-center">
          {[
            { id: 'avg_alpha_5y', label: '5Y Avg Alpha' },
            { id: 'rolling_alpha_1y', label: '1Y Rolling Alpha' },
            { id: 'avg_beta_5y', label: '5Y Avg Beta' },
            { id: 'rolling_beta_1y', label: '1Y Rolling Beta' }
          ].map(m => (
            <button key={m.id} onClick={() => setHistMetric(m.id)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${histMetric === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex mt-2 relative">
          <div className="flex-1 flex items-stretch justify-between gap-1 relative">
            <div className="absolute w-full h-[1px] bg-slate-300 top-1/2 left-0 z-0"></div>
            
            {data.map(stock => {
              const val = stock[histMetric];
              const heightPct = (Math.abs(val) / maxAbs) * 100;
              const isPositive = val >= 0;
              
              return (
                <div key={stock.ticker} className="flex-1 flex flex-col items-center relative z-10">
                  <div className="h-1/2 w-full flex items-end justify-center pb-[1px]">
                    {isPositive && <div style={{ height: `${heightPct}%` }} className="w-full max-w-[20px] bg-emerald-400 rounded-t-sm hover:bg-emerald-300 transition-colors"></div>}
                  </div>
                  <div className="h-1/2 w-full flex items-start justify-center pt-[1px]">
                    {!isPositive && <div style={{ height: `${heightPct}%` }} className="w-full max-w-[20px] bg-red-400 rounded-b-sm hover:bg-red-300 transition-colors"></div>}
                    <div className="absolute top-[55%] text-[10px] font-mono font-bold text-slate-500 uppercase select-none pointer-events-none" 
                         style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                      {stock.ticker}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- QUADRANTS RENDERER ---
  const renderQuadrants = () => {
    if (visibleRankings.length === 0 && hiddenTickers.length === 0) return null;

    const alphaKey = quadSetup === '5y' ? 'avg_alpha_5y' : 'rolling_alpha_1y';
    const betaKey = quadSetup === '5y' ? 'avg_beta_5y' : 'rolling_beta_1y';

    const minBeta = visibleRankings.length ? Math.min(...visibleRankings.map(d => d[betaKey])) - 0.2 : 0;
    const maxBeta = visibleRankings.length ? Math.max(...visibleRankings.map(d => d[betaKey])) + 0.2 : 2;
    const minAlpha = visibleRankings.length ? Math.min(...visibleRankings.map(d => d[alphaKey])) - 0.05 : -0.1;
    const maxAlpha = visibleRankings.length ? Math.max(...visibleRankings.map(d => d[alphaKey])) + 0.05 : 0.1;

    const padding = 8; 
    const mapToSafeZone = (val, min, max) => padding + ((val - min) / (max - min)) * (100 - 2 * padding);
    
    const getX = (beta) => mapToSafeZone(beta, minBeta, maxBeta);
    const getY = (alpha) => mapToSafeZone(alpha, minAlpha, maxAlpha);
    
    const zeroX = getX(1.0);
    const zeroY = getY(0.0);

    return (
      <div className="flex flex-col h-full p-4">
        {/* Setup Selector */}
        <div className="flex gap-2 justify-center">
          <button onClick={() => setQuadSetup('5y')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${quadSetup === '5y' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Setup 1: 5Y Alpha vs Beta
          </button>
          <button onClick={() => setQuadSetup('1y')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${quadSetup === '1y' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Setup 2: 1Y Alpha vs Beta
          </button>
        </div>

        {/* Recycle Bin for Hidden Tickers */}
        {hiddenTickers.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-3 items-center min-h-[24px]">
            <span className="text-xs text-slate-400 font-bold">Hidden Outliers:</span>
            <button 
                onClick={() => setHiddenTickers([])}
                className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center shadow-sm"
              >
                🔄 Restore All
            </button>
            {hiddenTickers.map(ticker => (
              <button 
                key={ticker}
                onClick={() => setHiddenTickers(hiddenTickers.filter(t => t !== ticker))}
                className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
              >
                + {ticker}
              </button>
            ))}
          </div>
        )}

        {/* Scatter Plot Area */}
        <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-lg overflow-hidden m-4 mt-3">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 px-2 rounded z-0 pointer-events-none">High Alpha (Outperforming)</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 px-2 rounded z-0 pointer-events-none">Low Alpha (Underperforming)</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 uppercase tracking-widest origin-left bg-slate-50/80 px-2 rounded z-0 pointer-events-none">Low Beta (Stable)</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-bold text-slate-400 uppercase tracking-widest origin-right bg-slate-50/80 px-2 rounded z-0 pointer-events-none">High Beta (Volatile)</div>

          <div className="absolute w-full border-t-2 border-slate-300 border-dashed z-0 pointer-events-none" style={{ bottom: `${zeroY}%` }}></div>
          <div className="absolute h-full border-l-2 border-slate-300 border-dashed z-0 pointer-events-none" style={{ left: `${zeroX}%` }}></div>

          {visibleRankings.map(stock => {
            const isWinner = stock[alphaKey] > 0;
            const xPos = getX(stock[betaKey]);
            const yPos = getY(stock[alphaKey]);
            
            const popLeft = xPos > 60; 
            const popDown = yPos > 60;

            return (
              <div key={stock.ticker} 
                onClick={() => setHiddenTickers([...hiddenTickers, stock.ticker])}
                className="absolute w-3 h-3 -ml-1.5 -mb-1.5 rounded-full cursor-pointer group z-10 transition-transform hover:scale-150 hover:z-20"
                style={{ 
                  left: `${xPos}%`, 
                  bottom: `${yPos}%`,
                  backgroundColor: isWinner ? '#34d399' : '#f87171', 
                  boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                }}>
                <div className={`absolute ${popLeft ? 'right-0' : 'left-0'} ${popDown ? 'top-full mt-2' : 'bottom-full mb-2'} text-[10px] font-mono text-slate-500 group-hover:text-slate-900 group-hover:bg-white group-hover:px-2 group-hover:py-1 group-hover:rounded group-hover:shadow-lg transition-all whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none border border-slate-200 z-50`}>
                  <div className="font-bold border-b border-slate-100 pb-0.5 mb-0.5"><span className="text-blue-600">{stock.ticker}</span> <span className="text-slate-400 font-normal text-[8px] uppercase tracking-wider">(Click to hide)</span></div>
                  <div>α: {(stock[alphaKey]*100).toFixed(2)}%</div>
                  <div>β: {stock[betaKey].toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-bold">Loading Data...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* CENTERED TOP NAV */}
      <div className="flex-none pb-4 border-b border-slate-100 flex justify-between items-center gap-4">
        {/* Left Area */}
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">He Yan <span className="text-blue-600">Portfolio</span></h1>
          <p className="text-xs text-slate-500 font-medium">Alpha & Beta Matrix Demo</p>
        </div>
        
        {/* Center Area (Countdown) */}
        <div className="flex-1 flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-wider">
          <span className="text-slate-400">most recent update {lastUpdateDate}</span>
          <span className="text-blue-500 mt-0.5">next update in {hoursUntilNext} hours</span>
        </div>

        {/* Right Area (Buttons) */}
        <div className="flex-1 flex justify-end">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 shadow-inner border border-slate-200">
            <button onClick={() => setActiveTab('individual')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'individual' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Individual 🔍</button>
            <button onClick={() => setActiveTab('ranking')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'ranking' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Group 📊</button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="bg-slate-800 px-4 py-2 flex items-center">
          <div className="flex-1 text-left">
            <span className="text-white font-bold text-sm">🏆 Quantitative Screener</span>
          </div>
          <div className="flex-none flex gap-1 bg-slate-700 p-1 rounded-lg">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'table' ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:text-white'}`}>Table</button>
            <button onClick={() => setViewMode('histogram')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'histogram' ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:text-white'}`}>Histogram</button>
            <button onClick={() => setViewMode('quadrants')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'quadrants' ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:text-white'}`}>Quadrants</button>
          </div>
          <div className="flex-1 text-right">
            <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded font-bold">S&P 500 Subset</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {viewMode === 'table' && (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600">Rank</th>
                  <HeaderButton label="Ticker" field="ticker" align="left" />
                  <HeaderButton label="5Y Avg Alpha" field="avg_alpha_5y" />
                  <HeaderButton label="1Y Rolling Alpha" field="rolling_alpha_1y" />
                  <HeaderButton label="5Y Avg Beta" field="avg_beta_5y" />
                  <HeaderButton label="1Y Rolling Beta" field="rolling_beta_1y" />
                  <HeaderButton label="Alpha Heat" field="hist_pct_alpha_1y" align="center" />
                  <HeaderButton label="Beta Heat" field="hist_pct_beta_1y" align="center" />
                </tr>
              </thead>
              <tbody>
                {sortedRankings.map((s, i) => (
                  <tr key={s.ticker} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-black text-blue-600">{s.ticker}</td>
                    <td className={`px-4 py-3 text-right font-mono ${sortConfig?.key === 'avg_alpha_5y' ? 'bg-blue-50/50 font-bold' : ''}`}>{(s.avg_alpha_5y * 100).toFixed(2)}%</td>
                    <td className={`px-4 py-3 text-right font-mono ${sortConfig?.key === 'rolling_alpha_1y' ? 'bg-blue-50/50 font-bold' : ''}`}>{(s.rolling_alpha_1y * 100).toFixed(2)}%</td>
                    <td className={`px-4 py-3 text-right font-mono ${sortConfig?.key === 'avg_beta_5y' ? 'bg-blue-50/50 font-bold' : ''}`}>{s.avg_beta_5y.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${sortConfig?.key === 'rolling_beta_1y' ? 'bg-blue-50/50 font-bold' : ''}`}>{s.rolling_beta_1y.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-flex items-center justify-center gap-1 w-24 ${s.hist_pct_alpha_1y >= 80 ? 'bg-emerald-100 text-emerald-700' : s.hist_pct_alpha_1y <= 20 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {s.hist_pct_alpha_1y >= 80 ? '🔥' : s.hist_pct_alpha_1y <= 20 ? '❄️' : ''} {s.hist_pct_alpha_1y.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-flex items-center justify-center gap-1 w-24 ${s.hist_pct_beta_1y >= 80 ? 'bg-emerald-100 text-emerald-700' : s.hist_pct_beta_1y <= 20 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {s.hist_pct_beta_1y >= 80 ? '📈' : s.hist_pct_beta_1y <= 20 ? '📉' : ''} {s.hist_pct_beta_1y.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {viewMode === 'histogram' && renderHistogram()}
          {viewMode === 'quadrants' && renderQuadrants()}
          
        </div>
      </div>
    </div>
  );
}