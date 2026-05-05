/*
* file path: frontend/src/App.jsx
*/

import { useState } from 'react'
import IndividualAnalysis from './components/IndividualAnalysis'
import RankingDashboard from './components/RankingDashboard'

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('individual')

  return (
    <div className="h-screen w-full bg-slate-200 p-2 md:p-4 font-sans box-border flex flex-col overflow-hidden">
      <div className="w-full h-full max-w-7xl mx-auto overflow-x-auto overflow-y-hidden bg-white rounded-xl shadow-2xl border border-slate-300 relative flex flex-col">
        
        {/* Dynamic Content Rendering */}
        <div className="flex flex-col flex-1 min-w-[900px] min-h-[600px] p-4 relative">
          
          {/* We render BOTH components, but use CSS to hide the inactive one */}
          <div className={`absolute inset-0 p-4 transition-opacity duration-300 ${activeTab === 'individual' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <IndividualAnalysis activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <div className={`absolute inset-0 p-4 transition-opacity duration-300 ${activeTab === 'ranking' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <RankingDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

        </div>

      </div>
    </div>
  )
}