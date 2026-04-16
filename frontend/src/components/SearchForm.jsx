/*
 * file path: frontend/src/components/SearchForm.jsx
 */
export default function SearchForm({ ticker, setTicker, period, setPeriod, loading, fetchMetrics }) {
  return (
    <div className="flex-none pb-4 border-b border-slate-100 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">
          He Yan <span className="text-blue-600">Portfolio</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">Alpha & Beta Matrix Demo</p>
      </div>

      <form onSubmit={fetchMetrics} className="flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="AAPL"
          required
          className="w-24 border border-slate-300 rounded-md px-3 py-1 focus:outline-none focus:border-blue-500 uppercase font-bold text-sm"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-slate-300 rounded-md px-2 py-1 font-bold text-sm bg-white cursor-pointer"
        >
          <option value="2y">2Y</option>
          <option value="3y">3Y</option>
          <option value="5y">5Y</option>
          <option value="10y">10Y</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-1.5 rounded-md font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-75 flex items-center justify-center min-w-[90px]"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-1 h-5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          ) : (
            'Analyze'
          )}
        </button>
      </form>
    </div>
  )
}