import json
import os
import boto3                  # AWS SDK for Python (lets us talk to DynamoDB)
import yfinance as yf         # Yahoo Finance API wrapper to download stock data
import pandas as pd           # Powerful data manipulation library (tables, columns, etc.)
import numpy as np            # Math library for high-speed matrix calculations
from datetime import datetime, timedelta

# Initialize the DynamoDB connection using the AWS region specified in template.yaml
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
# Grab the database table name dynamically from environment variables
table_name = os.environ.get('DYNAMODB_TABLE', 'AlphaBetaCache')

def calculate_metrics(ticker, period, benchmark='^GSPC'):
    """
    Downloads historical data and performs CAPM (Capital Asset Pricing Model) math 
    to determine Alpha and Beta.
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
    
    # --- ROLLING 1-YEAR DAILY BETA ---
    # Instead of one overall number, calculate Beta over a sliding 252-day window
    window = 252 
    rolling_cov = data['Stock'].rolling(window=window).cov(data['Market'])
    rolling_var = data['Market'].rolling(window=window).var()
    rolling_beta = rolling_cov / rolling_var
    
    # Clean up empty rows (the first 251 days won't have a 1-year beta yet)
    rolling_beta_clean = rolling_beta.dropna()
    
    # Format the pandas data into a list of dictionaries so Javascript can read it easily
    history = []
    for date, b_val in rolling_beta_clean.items():
        history.append({
            "date": date.strftime('%Y-%m-%d'),
            "beta": round(b_val, 4)
        })
        
    return round(overall_alpha, 4), round(overall_beta, 4), history

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
        # E.g., "AAPL#5y#2026-03-10" ensures we don't mix up 5Y data with 10Y data
        date_str = datetime.utcnow().strftime('%Y-%m-%d')
        cache_key = f"{ticker}#{period}#{date_str}"
        table = dynamodb.Table(table_name)
        
        # 3. ATTEMPT CACHE READ: Try to find this exact calculation in the database first
        try:
            response = table.get_item(Key={'id': cache_key})
            if 'Item' in response:
                data = response['Item']
                # If found, return it immediately! This takes ~50ms instead of ~3 seconds.
                return {
                    "statusCode": 200,
                    "headers": {"Access-Control-Allow-Origin": "*"}, # Bypasses CORS browser security
                    "body": json.dumps({
                        "ticker": ticker, "period": period, "alpha": float(data['alpha']), 
                        "beta": float(data['beta']), "history": json.loads(data.get('history', '[]')),
                        "cached": True
                    })
                }
        except Exception as db_err:
            pass # Ignore DB errors (like missing tables locally) and just calculate live
            
        # 4. CALCULATE LIVE: If not in cache, trigger the heavy Pandas math function
        alpha, beta, history = calculate_metrics(ticker, period)
        
        # 5. ATTEMPT CACHE WRITE: Save the result to DynamoDB for the next user
        try:
            # Set a Time-To-Live (TTL) so the database auto-deletes this data after 1 day
            ttl = int((datetime.utcnow() + timedelta(days=1)).timestamp())
            table.put_item(Item={
                'id': cache_key, 'ticker': ticker, 'period': period, 'alpha': str(alpha), 
                'beta': str(beta), 'history': json.dumps(history), 'ttl': ttl
            })
        except Exception as db_err:
            pass # Ignore write errors and continue sending the result to the user
        
        # 6. RETURN SUCCESS: Send the fresh calculation back to the React frontend
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "ticker": ticker, "period": period, "alpha": alpha, 
                "beta": beta, "history": history, "cached": False
            })
        }
    except Exception as e:
        # 7. ERROR HANDLING: If the code completely crashes, send a clean 500 error to the browser
        return {"statusCode": 500, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": str(e)})}