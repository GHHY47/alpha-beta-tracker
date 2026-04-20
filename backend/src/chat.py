# file path: backend/src/chat.py
import json
import os
# Importing the official, updated Google GenAI SDK
from google import genai
from google.genai import types

def lambda_handler(event, context):
    """
    AWS Lambda Entry Point.
    This function acts as a secure bridge between the React frontend and the Google Gemini API.
    """
    try:
        # ============================================================================
        # 1. SECURITY & INITIALIZATION
        # ============================================================================
        
        # We grab the API key from the AWS Environment Variables (or env.json locally).
        # NEVER hardcode API keys in the script.
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {
                "statusCode": 500, 
                "headers": {"Access-Control-Allow-Origin": "*"}, 
                "body": json.dumps({"error": "API Key missing"})
            }
        
        # Initialize the client using the new SDK syntax
        client = genai.Client(api_key=api_key)
        
        # Parse the incoming JSON payload sent by the React frontend's fetch() request
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '')
        stock_context = body.get('context', {}) 
        
        # ============================================================================
        # 2. CONTEXT EXTRACTION
        # ============================================================================
        # We extract all the rich data passed from the frontend. 
        # Using .get() with a default value prevents the code from crashing if a field is missing.
        
        ticker = stock_context.get('ticker', 'Unknown')
        period = str(stock_context.get('period', '5y')).upper() # Normalizes '5y' to '5Y'
        obs_date = stock_context.get('observation_date', 'Unknown Date')
        
        curr_alpha = stock_context.get('current_alpha', 'N/A')
        curr_beta = stock_context.get('current_beta', 'N/A')
        avg_alpha = stock_context.get('avg_alpha', 'N/A')
        avg_beta = stock_context.get('avg_beta', 'N/A')
        
        # DATA ARRAYS: We must convert the JavaScript arrays/objects into raw JSON strings.
        # LLMs are excellent at reading raw JSON strings to understand data structures.
        alpha_dist = json.dumps(stock_context.get('alpha_distribution', []))
        beta_dist = json.dumps(stock_context.get('beta_distribution', []))
        history_data = json.dumps(stock_context.get('history', []))
        
        # ============================================================================
        # 3. PROMPT ENGINEERING (The "System Instruction")
        # ============================================================================
        # This is where we inject the data variables into a strict set of rules.
        # The System Instruction tells the AI WHO it is, WHAT data it has, and HOW to format the answer.
        
        system_instruction = f"""
        You are a Senior Quantitative Analyst at a top-tier hedge fund. 
        The user is currently analyzing the stock {ticker} over a {period} timeframe, with a specific focus on the observation date: {obs_date}.
        
        --- METRICS CONTEXT ---
        - Current 1-Year Rolling Alpha on {obs_date}: {curr_alpha} (vs Historical {period} Average Alpha: {avg_alpha})
        - Current 1-Year Rolling Beta on {obs_date}: {curr_beta} (vs Historical {period} Average Beta: {avg_beta})
        
        --- STATISTICAL DISTRIBUTION (Frequency of occurrences over {period}) ---
        Alpha Histogram Bins: {alpha_dist}
        Beta Histogram Bins: {beta_dist}
        
        --- HISTORICAL TIME SERIES ---
        Recent time-series data leading up to the observation date:
        {history_data}

        --- CRITICAL RULES FOR YOUR RESPONSE ---
        1. TIME IS MONEY: The user has exactly 15 seconds to read this. Use extremely short, punchy bullet points. NO long paragraphs.
        2. JUST THE FACTS: Do NOT forecast the future, invent bear/bull narratives, or guess *why* the market moved. 
        3. NO STORYTELLING: Report the mathematical reality based solely on the provided numbers. 
        
        IF the user asks for a general analysis, a summary, or clicks a suggested prompt, format your response STRICTLY using these three headers:
        
        ### 1. Current State & Trend
        * (Max 2 bullet points). Directly compare today's numbers to the historical averages. State the immediate recent trajectory (e.g., "Beta plummeted over the last 5 days").
        
        ### 2. Quantitative Deep Dive
        * (Max 2 bullet points). State the exact statistical rarity of the current Alpha and Beta using the provided distribution bins (e.g., "Current Beta falls in the bottom 0.6% of historical occurrences"). 
        
        ### 3. Historical Risk Context
        * (Max 2 bullet points). Identify the pure mathematical risk (e.g., "Beta is drastically below its historical norm, indicating a sudden, severe decoupling from the benchmark"). DO NOT speculate on what will happen tomorrow.
        
        IF the user asks a direct question (e.g., "What is alpha?", "Why did it drop?", or "Hello"):
        Answer their specific question directly and concisely in 1-2 sentences. DO NOT use the 3-part format.
        """

        # ============================================================================
        # 4. API EXECUTION & RESPONSE
        # ============================================================================
        
        # We call the gemini-2.5-flash model. 
        # 'contents' is what the user actually typed.
        # 'config' applies our heavy System Instruction from above.
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            # model='gemini-2.0-flash', # <--- CHANGE THIS LINE TO 2.0
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
            )
        )
        
        # Return the AI's text response back to the React frontend.
        # The CORS headers (*) are required so the browser doesn't block the response.
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"reply": response.text})
        }
        
    except Exception as e:
        # Catch-all error handler. If anything fails (network issue, bad data, API quota),
        # it sends a clean 500 error to the frontend instead of crashing silently.
        return {
            "statusCode": 500, 
            "headers": {"Access-Control-Allow-Origin": "*"}, 
            "body": json.dumps({"error": str(e)})
        }