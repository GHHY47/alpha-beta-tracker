// file path: frontend/src/components/IndividualAnalysis.jsx
import { useState } from 'react'
import D3Dashboard from './D3Dashboard'
import SearchForm from './SearchForm'
import StatCards from './StatCards'
import ChatInterface from './ChatInterface'

export default function IndividualAnalysis({ activeTab, setActiveTab }) {
  // 1. STATE MANAGEMENT
  const [ticker, setTicker] = useState('AAPL')       
  const [period, setPeriod] = useState('5y')      
  const [data, setData] = useState(null)             
  const [loading, setLoading] = useState(false)      
  const [error, setError] = useState(null)           
  
  const [hoveredData, setHoveredData] = useState(null)
  const [lockedData, setLockedData] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // 2. API LOGIC
  const fetchMetrics = async (e) => {
    e.preventDefault() 
    setLoading(true); setError(null); setData(null); setHoveredData(null); setLockedData(null) 
    
    try {
      // Live AWS Production URL 
      const API_URL = `https://1idd4spcc5.execute-api.us-east-2.amazonaws.com/Prod/metrics?ticker=${ticker}&period=${period}`
      const response = await fetch(API_URL)
      
      if (!response.ok) throw new Error("Failed to fetch data.")
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      
      setData(result)
    } catch (err) { 
      setError(err.message) 
    } finally { 
      setLoading(false) 
    }
  }

  // 3. EVENT HANDLERS
  const handleLock = (point) => setLockedData(prev => prev?.date === point.date ? null : point)
  
  const handleDateInput = (e) => {
    const targetDate = e.target.value; 
    if (!targetDate || !data?.history) return;
    const targetTime = new Date(targetDate).getTime();
    setLockedData(data.history.reduce((prev, curr) => 
      Math.abs(new Date(curr.date).getTime() - targetTime) < Math.abs(new Date(prev.date).getTime() - targetTime) ? curr : prev
    ));
  }

  // 4. DERIVED STATE
  const mostRecentData = data?.history?.[data.history.length - 1]
  const activeData = hoveredData || lockedData || mostRecentData
  const isLockedView = lockedData && !hoveredData;

  // 5. RENDER LAYOUT
  return (
    <div className="flex flex-col h-full">
      <SearchForm 
        ticker={ticker} setTicker={setTicker} 
        period={period} setPeriod={setPeriod} 
        loading={loading} fetchMetrics={fetchMetrics} 
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        hasData={!!data} 
        
        // NEW: Pass the navigation props into the SearchForm
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />

      {error && <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm font-bold text-center border-b border-red-100 rounded">{error}</div>}

      {data && activeData ? (
        <div className={`flex-1 min-h-0 pt-4 grid ${isChatOpen ? 'grid-cols-3' : 'grid-cols-1'} gap-6`}>
          
          {/* LEFT SIDE: Dashboards & Charts */}
          <div className={`${isChatOpen ? 'col-span-2' : 'col-span-1'} flex flex-col gap-4 min-h-0 transition-all duration-300`}>
            <StatCards 
              data={data} 
              activeData={activeData} 
              lockedData={lockedData} 
              mostRecentData={mostRecentData} 
              isLockedView={isLockedView} 
              handleDateInput={handleDateInput} 
            />
            <div className="flex-1 min-h-0">
              <D3Dashboard 
                data={data} 
                onHover={setHoveredData} 
                lockedData={lockedData} 
                onLock={handleLock} 
              />
            </div>
          </div>

          {/* RIGHT SIDE: Gemini Chat */}
          {isChatOpen && (
            <div className="col-span-1 min-h-[400px] transition-all duration-300">
              <ChatInterface activeData={{ ticker, ...activeData }} globalData={data} onClose={() => setIsChatOpen(false)} />
            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
          Enter a ticker symbol and year to begin analysis.
        </div>
      )}
    </div>
  )
}