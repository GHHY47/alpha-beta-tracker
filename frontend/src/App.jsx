import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'

// ============================================================================
// 1. THE D3 BLACKBOX (Mathematically Synced & Pixel-Perfect)
// ============================================================================
const D3Dashboard = ({ data, onHover, lockedData, onLock }) => {
  const containerRef = useRef(null)
  
  const alphaLineWrapRef = useRef(null)
  const alphaHistWrapRef = useRef(null)
  const betaLineWrapRef = useRef(null)
  const betaHistWrapRef = useRef(null)
  
  const alphaLineRef = useRef(null)
  const alphaHistRef = useRef(null)
  const betaLineRef = useRef(null)
  const betaHistRef = useRef(null)

  useEffect(() => {
    if (!data || !data.history || data.history.length === 0) return

    const formattedData = data.history.map(d => ({ ...d, parsedDate: new Date(d.date) }))

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (containerRef.current) drawAllCharts()
      })
    })

    if (containerRef.current) resizeObserver.observe(containerRef.current)

    const drawAllCharts = () => {
      if (!alphaLineWrapRef.current || !betaLineWrapRef.current) return

      d3.select(alphaLineRef.current).selectAll("*").remove()
      d3.select(alphaHistRef.current).selectAll("*").remove()
      d3.select(betaLineRef.current).selectAll("*").remove()
      d3.select(betaHistRef.current).selectAll("*").remove()

      // Margins are perfectly mirrored to ensure Y-Axes align to the exact pixel
      const marginL = { top: 15, right: 15, bottom: 35, left: 45 }
      const marginH = { top: 15, right: 15, bottom: 35, left: 45 } 
      
      const wAL = alphaLineWrapRef.current.clientWidth
      const wAH = alphaHistWrapRef.current.clientWidth
      const hAlpha = alphaLineWrapRef.current.clientHeight // Both share the exact same height now
      
      const wBL = betaLineWrapRef.current.clientWidth
      const wBH = betaHistWrapRef.current.clientWidth
      const hBeta = betaLineWrapRef.current.clientHeight

      const innerWAL = wAL - marginL.left - marginL.right
      const innerWAH = wAH - marginH.left - marginH.right
      const innerHAlpha = hAlpha - marginL.top - marginL.bottom

      const innerWBL = wBL - marginL.left - marginL.right
      const innerWBH = wBH - marginH.left - marginH.right
      const innerHBeta = hBeta - marginL.top - marginL.bottom

      // --- 1. BULLETPROOF DOMAINS ---
      // We calculate the absolute min/max combining BOTH the line data AND the histogram bins
      const minA = Math.min(d3.min(formattedData, d => d.alpha), d3.min(data.alphaDistribution, d => d.min))
      const maxA = Math.max(d3.max(formattedData, d => d.alpha), d3.max(data.alphaDistribution, d => d.max))
      const padA = (maxA - minA) * 0.05
      
      const minB = Math.min(d3.min(formattedData, d => d.beta), d3.min(data.betaDistribution, d => d.min))
      const maxB = Math.max(d3.max(formattedData, d => d.beta), d3.max(data.betaDistribution, d => d.max))
      const padB = (maxB - minB) * 0.05

      const xLine = d3.scaleTime().domain(d3.extent(formattedData, d => d.parsedDate)).range([0, innerWAL])
      const yAlpha = d3.scaleLinear().domain([minA - padA, maxA + padA]).range([innerHAlpha, 0])
      const yBeta = d3.scaleLinear().domain([minB - padB, maxB + padB]).range([innerHBeta, 0])

      const xHistAlpha = d3.scaleLinear().domain([0, d3.max(data.alphaDistribution, d => d.percentage)]).nice().range([0, innerWAH])
      const xHistBeta = d3.scaleLinear().domain([0, d3.max(data.betaDistribution, d => d.percentage)]).nice().range([0, innerWBH])

      // --- 2. SVGs ---
      const svgAL = d3.select(alphaLineRef.current).attr("width", wAL).attr("height", hAlpha).append("g").attr("transform", `translate(${marginL.left},${marginL.top})`)
      const svgAH = d3.select(alphaHistRef.current).attr("width", wAH).attr("height", hAlpha).append("g").attr("transform", `translate(${marginH.left},${marginH.top})`)
      const svgBL = d3.select(betaLineRef.current).attr("width", wBL).attr("height", hBeta).append("g").attr("transform", `translate(${marginL.left},${marginL.top})`)
      const svgBH = d3.select(betaHistRef.current).attr("width", wBH).attr("height", hBeta).append("g").attr("transform", `translate(${marginH.left},${marginH.top})`)

      // --- 3. AXES (Fully Restored & Aligned) ---
      // Alpha Line
      svgAL.append("g").attr("transform", `translate(0,${innerHAlpha})`).call(d3.axisBottom(xLine).ticks(5).tickFormat(d3.timeFormat("%Y-%m"))).attr("color", "#94a3b8")
      svgAL.append("g").call(d3.axisLeft(yAlpha).ticks(6).tickFormat(d => `${(d * 100).toFixed(0)}%`)).attr("color", "#94a3b8")
      
      // Alpha Histogram
      svgAH.append("g").attr("transform", `translate(0,${innerHAlpha})`).call(d3.axisBottom(xHistAlpha).ticks(3).tickFormat(d => `${d}%`)).attr("color", "#94a3b8")
      svgAH.append("g").call(d3.axisLeft(yAlpha).ticks(6).tickFormat(d => `${(d * 100).toFixed(0)}%`)).attr("color", "#cbd5e1") 
      svgAH.append("text").attr("x", innerWAH / 2).attr("y", innerHAlpha + 30).attr("text-anchor", "middle").style("font-size", "10px").style("fill", "#94a3b8").style("font-weight", "bold").text("Frequency")
      
      // Beta Line
      svgBL.append("g").attr("transform", `translate(0,${innerHBeta})`).call(d3.axisBottom(xLine).ticks(5).tickFormat(d3.timeFormat("%Y-%m"))).attr("color", "#94a3b8")
      svgBL.append("g").call(d3.axisLeft(yBeta).ticks(6)).attr("color", "#94a3b8")
      
      // Beta Histogram
      svgBH.append("g").attr("transform", `translate(0,${innerHBeta})`).call(d3.axisBottom(xHistBeta).ticks(3).tickFormat(d => `${d}%`)).attr("color", "#94a3b8")
      svgBH.append("g").call(d3.axisLeft(yBeta).ticks(6)).attr("color", "#cbd5e1") 
      svgBH.append("text").attr("x", innerWBH / 2).attr("y", innerHBeta + 30).attr("text-anchor", "middle").style("font-size", "10px").style("fill", "#94a3b8").style("font-weight", "bold").text("Frequency")

      // Faint Gridlines
      svgAL.append("g").attr("class", "grid").call(d3.axisLeft(yAlpha).ticks(6).tickSize(-innerWAL).tickFormat("")).attr("stroke-opacity", 0.1)
      svgBL.append("g").attr("class", "grid").call(d3.axisLeft(yBeta).ticks(6).tickSize(-innerWBL).tickFormat("")).attr("stroke-opacity", 0.1)

      // --- 4. BASELINES ---
      const baseColor = "#f59e0b"
      svgAL.append("line").attr("x1", 0).attr("x2", innerWAL).attr("y1", yAlpha(data.alpha)).attr("y2", yAlpha(data.alpha)).attr("stroke", baseColor).attr("stroke-dasharray", "4").attr("stroke-width", 2).attr("opacity", 0.8)
      svgAH.append("line").attr("x1", 0).attr("x2", innerWAH).attr("y1", yAlpha(data.alpha)).attr("y2", yAlpha(data.alpha)).attr("stroke", baseColor).attr("stroke-dasharray", "4").attr("stroke-width", 2).attr("opacity", 0.8)
      svgBL.append("line").attr("x1", 0).attr("x2", innerWBL).attr("y1", yBeta(data.beta)).attr("y2", yBeta(data.beta)).attr("stroke", baseColor).attr("stroke-dasharray", "4").attr("stroke-width", 2).attr("opacity", 0.8)
      svgBH.append("line").attr("x1", 0).attr("x2", innerWBH).attr("y1", yBeta(data.beta)).attr("y2", yBeta(data.beta)).attr("stroke", baseColor).attr("stroke-dasharray", "4").attr("stroke-width", 2).attr("opacity", 0.8)

      // --- 5. DRAW DATA ---
      svgAL.append("path").datum(formattedData).attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 2).attr("d", d3.line().x(d => xLine(d.parsedDate)).y(d => yAlpha(d.alpha)))
      svgAH.selectAll("rect").data(data.alphaDistribution).join("rect")
        .attr("x", 0).attr("y", d => yAlpha(d.max)).attr("width", d => xHistAlpha(d.percentage)).attr("height", d => Math.max(1, yAlpha(d.min) - yAlpha(d.max))).attr("fill", "#34d399").attr("rx", 2).attr("opacity", 0.9)

      svgBL.append("path").datum(formattedData).attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 2).attr("d", d3.line().x(d => xLine(d.parsedDate)).y(d => yBeta(d.beta)))
      svgBH.selectAll("rect").data(data.betaDistribution).join("rect")
        .attr("x", 0).attr("y", d => yBeta(d.max)).attr("width", d => xHistBeta(d.percentage)).attr("height", d => Math.max(1, yBeta(d.min) - yBeta(d.max))).attr("fill", "#60a5fa").attr("rx", 2).attr("opacity", 0.9)

      // --- 6. D3 CROSSHAIRS ---
      const crossColor = "#64748b"
      const vLineA = svgAL.append("line").attr("y1", 0).attr("y2", innerHAlpha).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")
      const hLineAL = svgAL.append("line").attr("x1", 0).attr("x2", innerWAL).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")
      const hLineAH = svgAH.append("line").attr("x1", 0).attr("x2", innerWAH).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")

      const vLineB = svgBL.append("line").attr("y1", 0).attr("y2", innerHBeta).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")
      const hLineBL = svgBL.append("line").attr("x1", 0).attr("x2", innerWBL).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")
      const hLineBH = svgBH.append("line").attr("x1", 0).attr("x2", innerWBH).attr("stroke", crossColor).attr("stroke-dasharray", "3").style("display", "none")

      const syncCrosshairs = (point, isLocked = false) => {
        const color = isLocked ? "#ef4444" : crossColor
        const cx = xLine(point.parsedDate); const cyA = yAlpha(point.alpha); const cyB = yBeta(point.beta)
        vLineA.attr("x1", cx).attr("x2", cx).attr("stroke", color).style("display", null)
        hLineAL.attr("y1", cyA).attr("y2", cyA).attr("stroke", color).style("display", null)
        hLineAH.attr("y1", cyA).attr("y2", cyA).attr("stroke", color).style("display", null)
        vLineB.attr("x1", cx).attr("x2", cx).attr("stroke", color).style("display", null)
        hLineBL.attr("y1", cyB).attr("y2", cyB).attr("stroke", color).style("display", null)
        hLineBH.attr("y1", cyB).attr("y2", cyB).attr("stroke", color).style("display", null)
      }

      const hideCrosshairs = () => {
        if (!lockedData) {
          vLineA.style("display", "none"); hLineAL.style("display", "none"); hLineAH.style("display", "none")
          vLineB.style("display", "none"); hLineBL.style("display", "none"); hLineBH.style("display", "none")
        } else syncCrosshairs({ ...lockedData, parsedDate: new Date(lockedData.date) }, true)
      }

      const handleInteraction = function(event, isClick) {
        const [mouseX] = d3.pointer(event)
        const dateOnX = xLine.invert(mouseX)
        const bisect = d3.bisector(d => d.parsedDate).left
        const i = bisect(formattedData, dateOnX, 1)
        const d0 = formattedData[i - 1], d1 = formattedData[i]
        const closest = (dateOnX - d0.parsedDate > d1.parsedDate - dateOnX) ? d1 : d0
        if (isClick) onLock(closest)
        else { syncCrosshairs(closest, false); onHover(closest) }
      }

      svgAL.append("rect").attr("width", innerWAL).attr("height", innerHAlpha).style("fill", "none").style("pointer-events", "all")
        .on("mousemove", e => handleInteraction(e, false)).on("mouseout", () => { onHover(null); hideCrosshairs() }).on("click", e => handleInteraction(e, true))
      svgBL.append("rect").attr("width", innerWBL).attr("height", innerHBeta).style("fill", "none").style("pointer-events", "all")
        .on("mousemove", e => handleInteraction(e, false)).on("mouseout", () => { onHover(null); hideCrosshairs() }).on("click", e => handleInteraction(e, true))

      hideCrosshairs()
    }
    drawAllCharts()
    return () => resizeObserver.disconnect()
  }, [data, lockedData]) 

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-2 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 mb-1 flex justify-between items-center flex-none">
          Rolling 1-Year Alpha (Excess Return)
          <span className="text-[10px] font-normal text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">--- Avergae Alpha Baseline</span>
        </h3>
        <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 relative">
          <div ref={alphaLineWrapRef} className="col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            {/* Absolute inset-0 forces the SVG to perfectly match the flex grid cell */}
            <svg ref={alphaLineRef} className="absolute inset-0 w-full h-full"></svg>
          </div>
          <div ref={alphaHistWrapRef} className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <svg ref={alphaHistRef} className="absolute inset-0 w-full h-full"></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col pt-2 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-1 flex justify-between items-center flex-none">
          Rolling 1-Year Beta (Volatility)
          <span className="text-[10px] font-normal text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">--- Avergae Beta Baseline</span>
        </h3>
        <div className="flex-1 grid grid-cols-4 gap-2 min-h-0 relative">
          <div ref={betaLineWrapRef} className="col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <svg ref={betaLineRef} className="absolute inset-0 w-full h-full"></svg>
          </div>
          <div ref={betaHistWrapRef} className="col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm relative">
            <svg ref={betaHistRef} className="absolute inset-0 w-full h-full"></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 2. THE REACT APP
// ============================================================================
function App() {
  const [ticker, setTicker] = useState('AAPL')       
  const [period, setPeriod] = useState('5y')         
  const [data, setData] = useState(null)             
  const [loading, setLoading] = useState(false)      
  const [error, setError] = useState(null)           
  
  const [hoveredData, setHoveredData] = useState(null)
  const [lockedData, setLockedData] = useState(null)

  const fetchMetrics = async (e) => {
    e.preventDefault() 
    setLoading(true); setError(null); setData(null); setHoveredData(null); setLockedData(null) 
    
    try {
      // --- CHOOSE YOUR ENVIRONMENT HERE ---
      
      // 1. Local Testing URL (Keep this commented out for now)
      // const API_URL = `http://127.0.0.1:3000/metrics?ticker=${ticker}&period=${period}`

      // 2. Live AWS Production URL (Use this for GitHub/Live Website)
      const API_URL = `https://1sgf7bhu58.execute-api.us-east-2.amazonaws.com/Prod/metrics?ticker=${ticker}&period=${period}`

      // Fetch from whichever URL is active above
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

  const handleLock = (point) => setLockedData(prev => prev?.date === point.date ? null : point)
  const handleDateInput = (e) => {
    const targetDate = e.target.value; if (!targetDate || !data?.history) return;
    const targetTime = new Date(targetDate).getTime();
    setLockedData(data.history.reduce((prev, curr) => Math.abs(new Date(curr.date).getTime() - targetTime) < Math.abs(new Date(prev.date).getTime() - targetTime) ? curr : prev));
  }

  const mostRecentData = data?.history?.[data.history.length - 1]
  const activeData = hoveredData || lockedData || mostRecentData
  const isLockedView = lockedData && !hoveredData;

  const getYearBack = (dateStr) => {
    if (!dateStr) return ''; const d = new Date(dateStr); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]
  }
  const getFreq = (value, dist) => dist?.find(b => value >= b.min && value <= (b.max + 0.0001)) || { percentage: 0, count: 0 }

  return (
    <div className="h-screen w-full bg-slate-200 p-2 md:p-4 font-sans box-border flex flex-col overflow-hidden">
      <div className="w-full h-full max-w-7xl mx-auto overflow-x-auto overflow-y-hidden bg-white rounded-xl shadow-2xl border border-slate-300">
        <div className="flex flex-col h-full min-w-[900px] min-h-[600px] p-4">
          
          <div className="flex-none pb-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">He Yan <span className="text-blue-600">Portfolio</span></h1>
              <p className="text-xs text-slate-500 font-medium">Alpha & Beta Matrix Demo</p>
            </div>
            
            <form onSubmit={fetchMetrics} className="flex gap-2">
              <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" required className="w-24 border border-slate-300 rounded-md px-3 py-1 focus:outline-none focus:border-blue-500 uppercase font-bold text-sm" />
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1 font-bold text-sm bg-white cursor-pointer">
                <option value="2y">2Y</option><option value="3y">3Y</option><option value="5y">5Y</option><option value="10y">10Y</option>
              </select>
              {/* <button type="submit" disabled={loading} className="bg-slate-800 text-white px-4 py-1 rounded-md font-bold text-sm hover:bg-black transition-colors disabled:opacity-50">
                {loading ? '...' : 'Analyze'}
              </button> */}
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

          {error && <div className="mt-2 p-3 bg-red-50 text-red-600 text-sm font-bold text-center border-b border-red-100 rounded">{error}</div>}

          {data && activeData ? (
            <div className="flex-1 flex flex-col min-h-0 pt-4 gap-4">
              
              <div className={`flex-none grid grid-cols-3 gap-3 p-3 rounded-lg border-2 transition-colors ${isLockedView ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col justify-center text-left px-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observation Date & Time</p>
                  <input type="date" value={activeData.date} onChange={handleDateInput} min={data.history[0].date} max={mostRecentData.date} className={`text-lg font-black bg-transparent border-b border-dashed focus:outline-none focus:border-blue-500 pb-0.5 cursor-pointer w-40 ${isLockedView ? 'text-blue-700 border-blue-300' : 'text-slate-800 border-slate-300'}`} />
                  <p className="text-[10px] text-slate-500 mt-1">{getYearBack(activeData.date)} → {activeData.date}</p>
                  <p className={`text-[9px] font-bold mt-1 uppercase ${lockedData ? 'text-red-500' : 'text-slate-400'}`}>{lockedData ? '🔒 CLICK CHART TO UNLOCK' : 'DOUBLE CLICK CHART TO LOCK'}</p>
                </div>
                
                <div className="bg-white p-2.5 rounded shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-end border-b border-slate-50 pb-2 mb-2">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Avg Alpha</p><p className="text-lg font-black text-slate-700">{(data.alpha * 100).toFixed(2)}%</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Rolling Alpha</p><p className="text-lg font-black text-emerald-600">{(activeData.alpha * 100).toFixed(2)}%</p></div>
                  </div>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400">Distribution:</span><span className="text-[10px] font-semibold text-emerald-600">{getFreq(activeData.alpha, data.alphaDistribution).percentage}% ({getFreq(activeData.alpha, data.alphaDistribution).count} days)</span></div>
                </div>
                
                <div className="bg-white p-2.5 rounded shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-end border-b border-slate-50 pb-2 mb-2">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Avg Beta</p><p className="text-lg font-black text-slate-700">{data.beta.toFixed(2)}</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Rolling Beta</p><p className="text-lg font-black text-blue-600">{activeData.beta.toFixed(2)}</p></div>
                  </div>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400">Distribution:</span><span className="text-[10px] font-semibold text-blue-600">{getFreq(activeData.beta, data.betaDistribution).percentage}% ({getFreq(activeData.beta, data.betaDistribution).count} days)</span></div>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <D3Dashboard data={data} onHover={setHoveredData} lockedData={lockedData} onLock={handleLock} />
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
              Enter a ticker symbol and year to begin analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App