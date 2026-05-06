// file path: backend/src/worker/main.go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

var db *sql.DB

func init() {
	connStr := fmt.Sprintf("host=%s port=5432 user=%s password=%s dbname=%s sslmode=disable", os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASS"), os.Getenv("DB_NAME"))
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ ERROR connecting to DB:", err)
	}
}

func handler(ctx context.Context, sqsEvent events.SQSEvent) error {
	for _, msg := range sqsEvent.Records {
		ticker := msg.Body
		
		aA, rA, aB, rB, pA, pB, err := CalculateMetrics(ticker)
		if err != nil {
			fmt.Printf("❌ ERROR calculating metrics for %s: %v\n", ticker, err)
			return err
		}
		
		query := `INSERT INTO ticker_metrics (ticker, observation_date, avg_alpha_5y, rolling_alpha_1y, avg_beta_5y, rolling_beta_1y, hist_pct_alpha_1y, hist_pct_beta_1y, run_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (ticker, observation_date) DO UPDATE SET avg_alpha_5y=EXCLUDED.avg_alpha_5y, rolling_alpha_1y=EXCLUDED.rolling_alpha_1y, avg_beta_5y=EXCLUDED.avg_beta_5y, rolling_beta_1y=EXCLUDED.rolling_beta_1y, hist_pct_alpha_1y=EXCLUDED.hist_pct_alpha_1y, hist_pct_beta_1y=EXCLUDED.hist_pct_beta_1y, run_id=EXCLUDED.run_id, created_at=NOW();`
		
		_, err = db.Exec(query, ticker, time.Now().Format("2006-01-02"), aA, rA, aB, rB, pA, pB, uuid.New())
		if err != nil {
			fmt.Printf("❌ ERROR saving %s to database: %v\n", ticker, err)
			return err
		}
		
		fmt.Printf("✅ %s saved. Cooling down 8s...\n", ticker)
		time.Sleep(8 * time.Second)
	}
	return nil
}

func main() { lambda.Start(handler) }