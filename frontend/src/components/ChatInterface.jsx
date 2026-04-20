// file path: frontend/src/components/ChatInterface.jsx
import { useState } from 'react';

export default function ChatInterface({ activeData, globalData, onClose }) {
  // ============================================================================
  // 1. STATE MANAGEMENT
  // ============================================================================
  
  // 'messages' holds the entire chat history. We initialize it with one object: the AI's greeting.
  const [messages, setMessages] = useState([{ 
    role: 'ai', 
    text: 'Hi! I am your AI Quantitative Analyst. I am looking at the historical data, distributions, and current trends for this stock. What would you like to know?' 
  }]);
  
  // 'input' tracks exactly what the user is currently typing in the text box.
  const [input, setInput] = useState('');
  
  // 'loading' locks the UI (disables buttons/inputs) while we wait for AWS and Gemini to reply.
  const [loading, setLoading] = useState(false);

  // NEW: Read from LocalStorage and check if it's a new day!
  const [usesLeft, setUsesLeft] = useState(() => {
    const saved = localStorage.getItem('ai_usage_data');
    const today = new Date().toDateString(); // e.g., "Mon Apr 20 2026"

    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        // If the saved record is from today, use their remaining count
        if (parsedData.date === today) {
          return parsedData.count;
        }
      } catch (e) {
        // Fallback if parsing fails for any reason
      }
    }
    // If there is no data, OR if the date is from yesterday/older, reset to 5
    return 5;
  });

  // Array of quick-start buttons to help users who don't know what to ask.
  const suggestedPrompts = [
    "📊 Summarize the current risk profile",
    "📈 Analyze the recent trend",
    "🎯 Is the current Alpha an outlier?"
  ];

  // ============================================================================
  // 2. CORE LOGIC: THE SEND FUNCTION
  // ============================================================================
  
  // We pass 'textToSubmit' as an argument so this function can be used by BOTH 
  // the text input form AND the suggested prompt buttons.
  const handleSend = async (textToSubmit) => {
    // NEW: BLOCK IF OUT OF USES
    if (usesLeft <= 0) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Daily limit reached. Please try again tomorrow!' }]);
      return;
    }

    // GUARD CLAUSE: Stop immediately if the text is empty, no data is loaded, or we are already loading.
    if (!textToSubmit.trim() || !activeData || loading) return;

    // OPTIMISTIC UI UPDATE: Instantly show the user's message in the chat window 
    // before we even talk to the server. This makes the app feel lightning fast.
    setMessages(prev => [...prev, { role: 'user', text: textToSubmit }]);
    setInput('');       // Clear the text box
    setLoading(true);   // Turn on the "Gemini is analyzing..." animation

    try {
      // NOTE: Remember to change this to your Live AWS URL before pushing to GitHub!
      // const API_URL = 'http://127.0.0.1:3000/chat'; 

      // USE YOUR LIVE AWS URL HERE!
      // Change 1sgf7bhu58 -> 1idd4spcc5
      const API_URL = 'https://1idd4spcc5.execute-api.us-east-2.amazonaws.com/Prod/chat';
      
      // THE PAYLOAD: We package the user's message alongside the heavy financial data.
      // This is the "secret sauce" that gives Gemini its context.
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSubmit,
          context: {
            ticker: activeData.ticker || 'the selected stock',
            period: globalData.period,
            observation_date: activeData.date,
            current_alpha: activeData.alpha,
            current_beta: activeData.beta,
            avg_alpha: globalData.alpha,
            avg_beta: globalData.beta,
            alpha_distribution: globalData.alphaDistribution,
            beta_distribution: globalData.betaDistribution,
            history: globalData.history
          }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error); // Catch backend Python errors

      // SUCCESS: Append Gemini's response to the chat history.
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      
      // NEW: Update the uses left and save BOTH the count and date to the browser
      const newCount = Math.max(0, usesLeft - 1);
      const today = new Date().toDateString();
      
      setUsesLeft(newCount);
      localStorage.setItem('ai_usage_data', JSON.stringify({
        count: newCount,
        date: today
      }));

    } catch (err) {
      // Clean up ugly API error messages for a better User Experience
      let friendlyError = "An unexpected error occurred while analyzing the data. Please try again.";
      const rawError = err.message || "";

      if (rawError.includes("503")) {
        friendlyError = "The AI servers are experiencing a temporary traffic spike. Please wait a few seconds and try again.";
      } else if (rawError.includes("429") || rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("limit: 0")) {
        friendlyError = "The AI API key has exhausted its free-tier quota for the day. Please check back later.";
      } else if (rawError.includes("{")) {
        // If the error contains a raw JSON dump, chop it off and only show the first sentence
        friendlyError = rawError.split("{")[0].trim();
      } else {
        // Fallback for normal, short text errors
        friendlyError = rawError;
      }

      // FAILURE: Show the clean error in the chat box with a warning icon
      setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${friendlyError}` }]);
    } finally {
      // ALWAYS: Turn off the loading state, regardless of success or failure.
      setLoading(false);
    }
  };

  // ============================================================================
  // 3. EVENT HANDLERS & RENDERING
  // ============================================================================

  // Triggers when the user presses "Enter" or clicks the up arrow button in the form.
  const onSubmitForm = (e) => {
    e.preventDefault(); // Prevents the browser from refreshing the page on form submit
    handleSend(input);
  };

  // If the parent component hasn't loaded financial data yet, don't render the chat box at all.
  if (!activeData) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
      
      {/* HEADER */}
      <div className="bg-slate-800 text-white px-4 py-2 text-sm font-bold flex items-center justify-between">
        
        {/* LEFT SIDE: Title & Dynamic Badge grouped together */}
        <div className="flex items-center gap-3">
          <span>✨ Gemini AI Analyst</span>
          
          {/* THE RATE LIMIT BADGE */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-wide ${
            usesLeft > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
            usesLeft > 0 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
            'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
          }`}>
            {usesLeft}/5 Daily Uses
          </span>
        </div>
        
        {/* RIGHT SIDE: Minimize Button */}
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700 flex items-center justify-center"
          title="Minimize Chat"
        >
          ✕
        </button>
        
      </div>
      
      {/* MESSAGE HISTORY CONTAINER */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 min-h-0">
        
        {/* Loop through the messages array. Apply blue styling if it's the user, white styling if it's AI */}
        {messages.map((msg, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none shadow-sm'}`}>
            {msg.text}
          </div>
        ))}
        
        {/* NEW MODERN LOADING INDICATOR (Typing Bubble) */}
        {loading && (
          <div className="self-start bg-white border border-slate-200 p-3 rounded-lg rounded-bl-none shadow-sm flex items-center gap-1.5 h-10 w-16">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>

      {/* SUGGESTED PROMPTS */}
      {/* Conditional Rendering: Only show these buttons if the chat is brand new (length === 1) */}
      {messages.length === 1 && !loading && usesLeft > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, idx) => (
            <button 
              key={idx}
              onClick={() => handleSend(prompt)} // Passes the button's text to our master send function
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-full px-3 py-1.5 transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* USER INPUT FORM */}
      <form onSubmit={onSubmitForm} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} // Updates 'input' state on every keystroke
          placeholder={usesLeft > 0 ? "Ask a specific question..." : "Daily limit reached..."}
          className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          disabled={loading || usesLeft <= 0} // Lock the input while fetching OR out of uses
        />
        <button type="submit" disabled={loading || !input.trim() || usesLeft <= 0} className="bg-blue-600 text-white rounded-full p-2 w-9 h-9 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-opacity">
          ↑
        </button>
      </form>

    </div>
  );
}