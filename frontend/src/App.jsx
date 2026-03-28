import { useState } from 'react'
// Import necessary charting components from Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function App() {
  // --- REACT STATE MANAGEMENT ---
  // useState holds data that, when changed, forces the UI to re-draw itself.
  const [ticker, setTicker] = useState('AAPL')       // The text in the search bar
  const [period, setPeriod] = useState('5y')         // The value of the dropdown menu
  const [data, setData] = useState(null)             // The final JSON payload from the backend
  const [loading, setLoading] = useState(false)      // True when waiting for the API
  const [error, setError] = useState(null)           // Holds error messages (e.g. invalid ticker)

  // --- API CALL FUNCTION ---
  const fetchMetrics = async (e) => {
    e.preventDefault() // Stops the form from refreshing the entire web page on submit
    
    // Reset the UI before fetching new data
    setLoading(true)
    setError(null)
    setData(null)

    try {
      // Build the URL using the dynamic state variables
      // const API_URL = `http://127.0.0.1:3000/metrics?ticker=${ticker}&period=${period}`
      // const API_URL = 'https://1sgf7bhu58.execute-api.us-east-2.amazonaws.com/Prod/metrics'
      const API_URL = `https://1sgf7bhu58.execute-api.us-east-2.amazonaws.com/Prod/metrics?ticker=${ticker}&period=${period}`
      
      // Reach out to the Python backend
      const response = await fetch(API_URL)
      
      // If the backend returns a 404 or 500 status code, throw a catchable error
      if (!response.ok) throw new Error("Failed to fetch data or invalid ticker.")
      
      // Parse the raw text into a Javascript object
      const result = await response.json()
      
      // If our Python code safely caught an error and returned {"error": "..."}, throw it
      if (result.error) throw new Error(result.error)
      
      // Success! Save the data to React State, which triggers the UI to show the charts
      setData(result)
    } catch (err) {
      setError(err.message) // Show the error message in the red box
    } finally {
      setLoading(false)     // Turn off the "Analyzing..." button text regardless of success/fail
    }
  }

  // --- UI RENDERING ---
  return (
    // Outer wrapper centers everything on the screen with a light gray background
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      
      {/* Main White Dashboard Card */}
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Header section */}
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">Live Market Tracker</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">Real-time Alpha & 1-Year Rolling Beta</p>
        
        {/* SEARCH FORM */}
        <form onSubmit={fetchMetrics} className="flex gap-3 mb-8 max-w-lg mx-auto">
          {/* Ticker Input Field */}
          <input 
            type="text" 
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())} // Auto-capitalizes typing
            placeholder="e.g. MSFT"
            className="flex-1 border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 uppercase font-semibold text-slate-700 transition-colors"
            required
          />
          
          {/* Timeframe Dropdown */}
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="border-2 border-slate-200 rounded-lg px-3 py-3 focus:outline-none focus:border-blue-500 font-bold text-slate-700 bg-white cursor-pointer"
          >
            <option value="2y">2Y</option>
            <option value="3y">3Y</option>
            <option value="5y">5Y</option>
            <option value="10y">10Y</option>
          </select>

          {/* Submit Button (Disables itself so users can't spam clicks while it loads) */}
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {/* ERROR DISPLAY: Only renders if the 'error' state has text in it */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* DATA DISPLAY: Only renders if 'data' was successfully fetched */}
        {data && (
          // fade-in animation to make the UI feel smooth
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Top Stat Cards (Side by side on desktop, stacked on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Overall Beta Card */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  Overall Beta ({data.period.toUpperCase()})
                </p>
                <p className="text-4xl font-black text-slate-800 tracking-tight">{data.beta}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Market volatility multiplier</p>
              </div>
              
              {/* Overall Alpha Card */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  Overall Alpha ({data.period.toUpperCase()})
                </p>
                <p className="text-4xl font-black text-slate-800 tracking-tight">
                  {(data.alpha * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Excess return vs CAPM expectation</p>
              </div>
            </div>

            {/* CHART DISPLAY: Only renders if there is actual history data */}
            {data.history && data.history.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-bold text-slate-700 mb-4 text-center">Rolling 1-Year Beta</h2>
                
                {/* The Chart Container (Height forced to 72, Width flexes to fit screen) */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      
                      {/* X-Axis: Takes the date string (YYYY-MM-DD) and cuts it to just YYYY-MM */}
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        tickFormatter={(tick) => tick.substring(0, 7)}
                        minTickGap={30} // Prevents dates from squishing together
                      />
                      
                      {/* Y-Axis: Automatically sizes to fit data range */}
                      <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        tickFormatter={(val) => val.toFixed(2)}
                      />
                      
                      {/* Hover Tooltip Box Styling */}
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                      />
                      
                      {/* The actual blue line drawing the data */}
                      <Line 
                        type="monotone" 
                        dataKey="beta" 
                        stroke="#2563eb" 
                        strokeWidth={2} 
                        dot={false}             // Hide standard dots to keep line smooth
                        activeDot={{ r: 6 }}    // Make dot appear only when hovering
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App