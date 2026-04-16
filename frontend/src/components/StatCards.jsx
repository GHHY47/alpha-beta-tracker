/**
 * file path: frontend/src/components/StatCards.jsx
 */

export default function StatCards({ data, activeData, lockedData, mostRecentData, isLockedView, handleDateInput }) {
  
  // Helper functions moved here to keep App.jsx clean
  const getYearBack = (dateStr) => {
    if (!dateStr) return ''; 
    const d = new Date(dateStr); 
    d.setFullYear(d.getFullYear() - 1); 
    return d.toISOString().split('T')[0];
  }

  const getFreq = (value, dist) => {
    return dist?.find(b => value >= b.min && value <= (b.max + 0.0001)) || { percentage: 0, count: 0 };
  }

  return (
    <div className={`flex-none grid grid-cols-3 gap-3 p-3 rounded-lg border-2 transition-colors ${isLockedView ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
      
      {/* Date & Time Column */}
      <div className="flex flex-col justify-center text-left px-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observation Date & Time</p>
        <input 
          type="date" 
          value={activeData.date} 
          onChange={handleDateInput} 
          min={data.history[0].date} 
          max={mostRecentData.date} 
          className={`text-lg font-black bg-transparent border-b border-dashed focus:outline-none focus:border-blue-500 pb-0.5 cursor-pointer w-40 ${isLockedView ? 'text-blue-700 border-blue-300' : 'text-slate-800 border-slate-300'}`} 
        />
        <p className="text-[10px] text-slate-500 mt-1">{getYearBack(activeData.date)} → {activeData.date}</p>
        <p className={`text-[9px] font-bold mt-1 uppercase ${lockedData ? 'text-red-500' : 'text-slate-400'}`}>
          {lockedData ? '🔒 DOUBLE CLICK CHART TO UNLOCK' : 'CLICK CHART TO LOCK'}
        </p>
      </div>
      
      {/* Alpha Column */}
      <div className="bg-white p-2.5 rounded shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex justify-between items-end border-b border-slate-50 pb-2 mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Alpha</p>
            <p className="text-lg font-black text-slate-700">{(data.alpha * 100).toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Rolling Alpha</p>
            <p className="text-lg font-black text-emerald-600">{(activeData.alpha * 100).toFixed(2)}%</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400">Distribution:</span>
          <span className="text-[10px] font-semibold text-emerald-600">
            {getFreq(activeData.alpha, data.alphaDistribution).percentage}% ({getFreq(activeData.alpha, data.alphaDistribution).count} days)
          </span>
        </div>
      </div>
      
      {/* Beta Column */}
      <div className="bg-white p-2.5 rounded shadow-sm border border-slate-100 flex flex-col justify-between">
        <div className="flex justify-between items-end border-b border-slate-50 pb-2 mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Beta</p>
            <p className="text-lg font-black text-slate-700">{data.beta.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Rolling Beta</p>
            <p className="text-lg font-black text-blue-600">{activeData.beta.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400">Distribution:</span>
          <span className="text-[10px] font-semibold text-blue-600">
            {getFreq(activeData.beta, data.betaDistribution).percentage}% ({getFreq(activeData.beta, data.betaDistribution).count} days)
          </span>
        </div>
      </div>

    </div>
  )
}