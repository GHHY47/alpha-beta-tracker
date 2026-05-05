// file path: frontend/src/components/RankingDashboard.jsx
import { useState, useEffect, useMemo } from 'react';
export default function RankingDashboard({ activeTab, setActiveTab }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'hist_pct_alpha_1y', direction: 'desc' });

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    fetch(`${API_URL}/rankings`)
      .then(res => { if (!res.ok) throw new Error("API unreachable"); return res.json(); })
      .then(data => { setRankings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

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
        <button onClick={() => requestSort(field)} className={`font-bold ${isActive ? 'text-blue-600 underline' : 'text-slate-600'}`}>
          {label} {isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
        </button>
      </th>
    );
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading Rankings...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-none pb-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-black text-slate-800">He Yan <span className="text-blue-600">Portfolio</span></h1>
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
          <button onClick={() => setActiveTab('individual')} className={`px-4 py-1.5 text-sm font-bold rounded ${activeTab === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Individual 🔍</button>
          <button onClick={() => setActiveTab('ranking')} className={`px-4 py-1.5 text-sm font-bold rounded ${activeTab === 'ranking' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Group 📊</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="bg-slate-800 text-white px-4 py-3 font-bold flex justify-between items-center"><span>🏆 Quantitative Screener</span></div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 border-b shadow-sm z-10">
              <tr><th className="px-4 py-3 font-bold">Rank</th><HeaderButton label="Ticker" field="ticker" align="left" /><HeaderButton label="5Y Alpha" field="avg_alpha_5y" /><HeaderButton label="1Y Rolling" field="rolling_alpha_1y" /><HeaderButton label="5Y Beta" field="avg_beta_5y" /><HeaderButton label="1Y Beta" field="rolling_beta_1y" /><HeaderButton label="Alpha Heat" field="hist_pct_alpha_1y" align="center" /><HeaderButton label="Beta Heat" field="hist_pct_beta_1y" align="center" /></tr>
            </thead>
            <tbody>
              {sortedRankings.map((s, i) => (
                <tr key={s.ticker} className="border-b hover:bg-blue-50">
                  <td className="px-4 py-3 text-slate-400">#{i + 1}</td><td className="px-4 py-3 font-black text-blue-600">{s.ticker}</td><td className="px-4 py-3 text-right">{(s.avg_alpha_5y * 100).toFixed(2)}%</td><td className="px-4 py-3 text-right">{(s.rolling_alpha_1y * 100).toFixed(2)}%</td><td className="px-4 py-3 text-right">{s.avg_beta_5y.toFixed(2)}</td><td className="px-4 py-3 text-right">{s.rolling_beta_1y.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${s.hist_pct_alpha_1y >= 80 ? 'bg-emerald-100 text-emerald-700' : s.hist_pct_alpha_1y <= 20 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>{s.hist_pct_alpha_1y.toFixed(1)}%</span></td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${s.hist_pct_beta_1y >= 80 ? 'bg-emerald-100 text-emerald-700' : s.hist_pct_beta_1y <= 20 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>{s.hist_pct_beta_1y.toFixed(1)}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}