// file path: backend/src/api/main.go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	_ "github.com/lib/pq"
)

var db *sql.DB

var TICKERS = []string{"NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "AVGO", "META", "TSLA", "BRK.B", "WMT", "JPM", "LLY", "XOM", "V", "MU", "JNJ", "AMD", "ORCL", "MA", "COST", "INTC", "NFLX", "CAT", "CVX", "BAC", "ABBV", "PG", "CSCO", "KO", "PLTR", "UNH", "HD", "LRCX", "AMAT", "GE", "MS", "GEV", "GS", "MRK", "PM", "WFC", "TXN", "KLAC", "LIN", "RTX", "C", "IBM", "AXP", "PEP"}

type Ranking struct {
	Ticker         string  `json:"ticker"`
	AvgAlpha5Y     float64 `json:"avg_alpha_5y"`
	RollingAlpha1Y float64 `json:"rolling_alpha_1y"`
	AvgBeta5Y      float64 `json:"avg_beta_5y"`
	RollingBeta1Y  float64 `json:"rolling_beta_1y"`
	HistPctAlpha1Y float64 `json:"hist_pct_alpha_1y"`
	HistPctBeta1Y  float64 `json:"hist_pct_beta_1y"`
}

func init() {
    // Change sslmode=disable to sslmode=require
    connStr := fmt.Sprintf("host=%s port=5432 user=%s password=%s dbname=%s sslmode=require", 
        os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASS"), os.Getenv("DB_NAME"))
    
    var err error
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	h := map[string]string{"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
	q := `SELECT ticker, ROUND(avg_alpha_5y, 4), ROUND(rolling_alpha_1y, 4), ROUND(avg_beta_5y, 4), ROUND(rolling_beta_1y, 4), COALESCE(ROUND(CAST(hist_pct_alpha_1y AS NUMERIC), 2), 0), COALESCE(ROUND(CAST(hist_pct_beta_1y AS NUMERIC), 2), 0) FROM ticker_metrics WHERE observation_date = (SELECT MAX(observation_date) FROM ticker_metrics);`
	
    // Execute the query
    rows, err := db.QueryContext(ctx, q)
	if err != nil {
        // ADD THIS LINE BELOW:
        fmt.Println("❌ DATABASE QUERY ERROR:", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: h, Body: `{"error": "DB Fail"}`}, nil
	}
	defer rows.Close()

	var rks []Ranking
	for rows.Next() {
		var r Ranking
		rows.Scan(&r.Ticker, &r.AvgAlpha5Y, &r.RollingAlpha1Y, &r.AvgBeta5Y, &r.RollingBeta1Y, &r.HistPctAlpha1Y, &r.HistPctBeta1Y)
		rks = append(rks, r)
	}

	// --- DAY 0 AUTO-SEED LOGIC ---
	// If the database is empty, trigger the SQS queue immediately
	if len(rks) == 0 {
		fmt.Println("Table is empty. Triggering initial SQS fan-out...")
		cfg, _ := config.LoadDefaultConfig(ctx, config.WithRegion("us-east-2"))
		client := sqs.NewFromConfig(cfg)
		queueUrl := os.Getenv("SQS_QUEUE_URL")

		if queueUrl != "" {
			for _, t := range TICKERS {
				client.SendMessage(ctx, &sqs.SendMessageInput{
					QueueUrl:    aws.String(queueUrl),
					MessageBody: aws.String(t),
				})
			}
			fmt.Println("✅ 50 tickers queued for processing.")
		}
	}
	// -----------------------------

	b, _ := json.Marshal(rks)
	return events.APIGatewayProxyResponse{StatusCode: 200, Headers: h, Body: string(b)}, nil
}

func main() { lambda.Start(handler) }