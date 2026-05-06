// file path: backend/src/producer/main.go
package main

import (
	"context"
	"fmt"
	"os" // Make sure to import os

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

var TICKERS = []string{"NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "AVGO", "META", "TSLA", "BRK.B", "WMT", "JPM", "LLY", "XOM", "V", "MU", "JNJ", "AMD", "ORCL", "MA", "COST", "INTC", "NFLX", "CAT", "CVX", "BAC", "ABBV", "PG", "CSCO", "KO", "PLTR", "UNH", "HD", "LRCX", "AMAT", "GE", "MS", "GEV", "GS", "MRK", "PM", "WFC", "TXN", "KLAC", "LIN", "RTX", "C", "IBM", "AXP", "PEP"}

func handler(ctx context.Context) error {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion("us-east-2"))
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %v", err)
	}

	client := sqs.NewFromConfig(cfg)
    
	// Pull the URL directly from the environment variables defined in template.yaml
	queueUrl := os.Getenv("SQS_QUEUE_URL")
	if queueUrl == "" {
		return fmt.Errorf("SQS_QUEUE_URL environment variable is empty")
	}

	for _, t := range TICKERS {
		_, err := client.SendMessage(ctx, &sqs.SendMessageInput{
			QueueUrl:    aws.String(queueUrl),
			MessageBody: aws.String(t),
		})
		
		// Properly handle individual message failures instead of crashing
		if err != nil {
			fmt.Printf("❌ ERROR sending %s to queue: %v\n", t, err)
		}
	}
	fmt.Println("✅ Fan-out complete!")
	return nil
}

func main() { lambda.Start(handler) }