// file path: backend/src/producer/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

var TICKERS = []string{"NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "AVGO", "META", "TSLA", "BRK.B", "WMT", "JPM", "LLY", "XOM", "V", "MU", "JNJ", "AMD", "ORCL", "MA", "COST", "INTC", "NFLX", "CAT", "CVX", "BAC", "ABBV", "PG", "CSCO", "KO", "PLTR", "UNH", "HD", "LRCX", "AMAT", "GE", "MS", "GEV", "GS", "MRK", "PM", "WFC", "TXN", "KLAC", "LIN", "RTX", "C", "IBM", "AXP", "PEP"}

func handler(ctx context.Context) error {
	cfg, _ := config.LoadDefaultConfig(ctx, config.WithRegion("us-east-2"))
	client := sqs.NewFromConfig(cfg)
	res, _ := client.GetQueueUrl(ctx, &sqs.GetQueueUrlInput{QueueName: aws.String("alphabeta-processing-queue")})
	for _, t := range TICKERS {
		client.SendMessage(ctx, &sqs.SendMessageInput{QueueUrl: res.QueueUrl, MessageBody: aws.String(t)})
	}
	fmt.Println("✅ Fan-out complete!")
	return nil
}

func main() { lambda.Start(handler) }