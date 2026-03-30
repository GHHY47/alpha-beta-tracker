import json
import os
import boto3                  # AWS SDK for Python (lets us talk to DynamoDB)
import yfinance as yf         # Yahoo Finance API wrapper to download stock data
import pandas as pd           # Powerful data manipulation library (tables, columns, etc.)
import numpy as np            # Math library for high-speed matrix calculations
from datetime import datetime, timedelta

# Initialize the DynamoDB connection using the dynamic AWS region
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-2'))
# Grab the database table name dynamically from environment variables (fixes the hardcoded naming issue)
table_name = os.environ.get('DYNAMODB_TABLE', 'AlphaBetaCache')

def create_distribution(data_series: pd.Series, num_bins: int = 30) -> list:
    """
    NEW HELPER: Groups 252 days of rolling data into 30 buckets (bins) so the frontend 
    can easily draw a histogram (bell curve) without doing heavy math in the browser.
    
    Java Equivalent: public List<Map<String, Object>> createDistribution(...)
    """
    # np.histogram automatically finds the min/max of the data and cuts it into 30 even slices
    counts, bin_edges = np.histogram(data_series, bins=num_bins)
    total_count = len(data_series)
    
    distribution = [] # This is Python's version of an ArrayList
    for i in range(len(counts)):
        # Calculate the exact middle of the bin (e.g., if bin is 1.0 to 1.2, center is 1.1)
        bin_center = (bin_edges[i] + bin_edges[i+1]) / 2
        
        # Append a HashMap/Dictionary for this specific bar on the chart
        distribution.append({
            "bin": round(bin_center, 4),               # The X-axis label
            "min": round(bin_edges[i], 4),             # Start of the bucket
            "max": round(bin_edges[i+1], 4),           # End of the bucket
            "count": int(counts[i]),                   # How many days fell in this bucket
            "percentage": round((counts[i] / total_count) * 100, 2) # Y-axis percentage
        })
    return distribution

def calculate_metrics(ticker: str, period: str, benchmark: str = '^GSPC') -> tuple:
    """
    Downloads historical data and performs CAPM (Capital Asset Pricing Model) math 
    to determine Alpha, Beta, and their statistical distributions.
    """
    # 1. FETCH DATA: Get daily closing prices for both the stock and the S&P 500
    stock_data = yf.Ticker(ticker).history(period=period, interval='1d')['Close']
    market_data = yf.Ticker(benchmark).history(period=period, interval='1d')['Close']
    
    # 2. CALCULATE RETURNS: pct_change() turns absolute prices into daily % returns
    # dropna() removes the very first row (since day 1 has no previous day to compare to)
    stock_returns = stock_data.pct_change().dropna()
    market_returns = market_data.pct_change().dropna()
    
    # 3. ALIGN DATA: Stick both columns together side-by-side. 
    # This ensures dates perfectly match up even if a stock halted trading for a day.
    data = pd.concat([stock_returns, market_returns], axis=1).dropna()
    data.columns = ['Stock', 'Market']
    
    # --- OVERALL ALPHA & BETA MATH ---
    # Beta = Covariance(Stock, Market) / Variance(Market)
    cov_matrix = np.cov(data['Stock'], data['Market'])
    cov = cov_matrix[0, 1]              # Extract the covariance value from the matrix
    var_market = cov_matrix[1, 1]       # Extract the market variance from the matrix
    overall_beta = cov / var_market     # The actual Beta calculation!
    
    # Annualize the daily returns (252 represents the number of trading days in a year)
    annual_stock_return = (1 + data['Stock'].mean()) ** 252 - 1
    annual_market_return = (1 + data['Market'].mean()) ** 252 - 1
    
    # Alpha = Actual Return - Expected Return (Risk-Free Rate + Beta * Market Risk Premium)
    rf = 0.04 # Assuming a standard 4% Risk-Free Rate (like a US Treasury Bond)
    overall_alpha = annual_stock_return - (rf + overall_beta * (annual_market_return - rf))
    
    # --- ROLLING 1-YEAR DAILY METRICS ---
    # Calculate Beta over a sliding 252-day window
    window = 252 
    rolling_cov = data['Stock'].rolling(window=window).cov(data['Market'])
    rolling_var = data['Market'].rolling(window=window).var()
    rolling_beta = rolling_cov / rolling_var
    
    # Calculate Rolling 1-Year Returns directly from prices (Price Today / Price 252 Days Ago)
    rolling_stock_return = (stock_data / stock_data.shift(window)) - 1
    rolling_market_return = (market_data / market_data.shift(window)) - 1
    
    # Calculate Rolling 1-Year Alpha using the rolling beta and rolling returns
    rolling_alpha = rolling_stock_return - (rf + rolling_beta * (rolling_market_return - rf))
    
    # Combine into a single table to align dates and clean up empty rows (the first 251 days)
    rolling_metrics = pd.DataFrame({
        'beta': rolling_beta,
        'alpha': rolling_alpha
    }).dropna()
    
    # --- FORMAT TIME-SERIES HISTORY ---
    # Format the pandas data into a list of dictionaries so Javascript can read it easily
    history = []
    for date, row in rolling_metrics.iterrows():
        history.append({
            "date": date.strftime('%Y-%m-%d'),
            "beta": round(row['beta'], 4),
            "alpha": round(row['alpha'], 4)  # Now includes Alpha!
        })
        
    # --- CALCULATE DISTRIBUTIONS ---
    # Pass the raw data columns into our new helper function to generate the histograms
    beta_distribution = create_distribution(rolling_metrics['beta'])
    alpha_distribution = create_distribution(rolling_metrics['alpha'])
        
    return round(overall_alpha, 4), round(overall_beta, 4), history, beta_distribution, alpha_distribution

def lambda_handler(event, context):
    """
    The main entry point for the AWS Lambda function.
    It manages the API request, checks the cache, runs the math, and returns JSON.
    """
    try:
        # 1. PARSE INCOMING REQUEST: Grab URL variables (e.g., ?ticker=AAPL&period=5y)
        query_params = event.get('queryStringParameters') or {}
        ticker = query_params.get('ticker', 'AAPL').upper()
        period = query_params.get('period', '5y').lower() 
        
        # 2. GENERATE CACHE KEY: Create a unique ID for today's specific search
        date_str = datetime.utcnow().strftime('%Y-%m-%d')
        cache_key = f"{ticker}#{period}#{date_str}"
        table = dynamodb.Table(table_name)
        
        # 3. ATTEMPT CACHE READ: Try to find this exact calculation in the database first
        try:
            response = table.get_item(Key={'id': cache_key})
            if 'Item' in response:
                data = response['Item']
                # If found, return it immediately! Takes ~50ms instead of ~3 seconds.
                return {
                    "statusCode": 200,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({
                        "ticker": ticker, "period": period, 
                        "alpha": float(data['alpha']), "beta": float(data['beta']), 
                        "history": json.loads(data.get('history', '[]')),
                        "betaDistribution": json.loads(data.get('betaDistribution', '[]')),
                        "alphaDistribution": json.loads(data.get('alphaDistribution', '[]')),
                        "cached": True
                    })
                }
        except Exception as db_err:
            pass # Ignore DB errors and just calculate live
            
        # 4. CALCULATE LIVE: If not in cache, trigger the heavy Pandas math function
        alpha, beta, history, beta_dist, alpha_dist = calculate_metrics(ticker, period)
        
        # 5. ATTEMPT CACHE WRITE: Save the result to DynamoDB for the next user
        try:
            # Set a Time-To-Live (TTL) so the database auto-deletes this data after 1 day
            ttl = int((datetime.utcnow() + timedelta(days=1)).timestamp())
            table.put_item(Item={
                'id': cache_key, 'ticker': ticker, 'period': period, 
                'alpha': str(alpha), 'beta': str(beta), 
                'history': json.dumps(history), 
                'betaDistribution': json.dumps(beta_dist),
                'alphaDistribution': json.dumps(alpha_dist),
                'ttl': ttl
            })
        except Exception as db_err:
            pass # Ignore write errors and continue sending the result to the user
        
        # 6. RETURN SUCCESS: Send the fresh calculation back to the React frontend
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "ticker": ticker, "period": period, "alpha": alpha, 
                "beta": beta, "history": history, 
                "betaDistribution": beta_dist, "alphaDistribution": alpha_dist,
                "cached": False
            })
        }
    except Exception as e:
        # 7. ERROR HANDLING: If the code completely crashes, send a clean 500 error to the browser
        return {"statusCode": 500, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": str(e)})}