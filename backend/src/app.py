# file path: backend/src/app.py
import json
import os
import boto3                  # AWS SDK for Python (lets us talk to DynamoDB)
from datetime import datetime, timedelta

# Import the math logic from our new separated file
from finance_math import calculate_metrics

# Initialize the DynamoDB connection using the dynamic AWS region
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-2'))
# Grab the database table name dynamically from environment variables (fixes the hardcoded naming issue)
table_name = os.environ.get('DYNAMODB_TABLE', 'AlphaBetaCache')

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