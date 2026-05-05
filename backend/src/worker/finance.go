// file path: backend/src/worker/finance.go
package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"time"
)

type TwelveDataResponse struct {
	Values []struct {
		Datetime string `json:"datetime"`
		Close    string `json:"close"`
	} `json:"values"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type PricePoint struct {
	Date  string
	Price float64
}

var cachedSPY []PricePoint
var cacheDate string

func getGSPC(apiKey string) ([]PricePoint, error) {
	today := time.Now().Format("2006-01-02")
	if len(cachedSPY) > 0 && cacheDate == today {
		return cachedSPY, nil
	}
	prices, err := fetchPrices("SPY", 1300, apiKey)
	if err != nil { return nil, err }
	cachedSPY = prices
	cacheDate = today
	return cachedSPY, nil
}

func getAPIKey() (string, error) {
	key := os.Getenv("TWELVE_DATA_API_KEY")
	if key == "" {
		return "", fmt.Errorf("TWELVE_DATA_API_KEY environment variable is empty")
	}
	return key, nil
}

func fetchPrices(ticker string, outputSize int, apiKey string) ([]PricePoint, error) {
	url := fmt.Sprintf("https://api.twelvedata.com/time_series?symbol=%s&interval=1day&outputsize=%d&apikey=%s", ticker, outputSize, apiKey)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(url)
	if err != nil { return nil, err }
	defer resp.Body.Close()
	var result TwelveDataResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil { return nil, err }
	if result.Status != "ok" || len(result.Values) == 0 {
		return nil, fmt.Errorf("Status '%s': %s", result.Status, result.Message)
	}
	var cleanPrices []PricePoint
	for i := len(result.Values) - 1; i >= 0; i-- {
		p, err := strconv.ParseFloat(result.Values[i].Close, 64)
		if err == nil && p > 0 {
			cleanPrices = append(cleanPrices, PricePoint{Date: result.Values[i].Datetime, Price: p})
		}
	}
	return cleanPrices, nil
}

func calculateBeta(sRet, mRet []float64) float64 {
	if len(sRet) == 0 { return 0 }
	var sumS, sumM float64
	n := float64(len(sRet))
	for i := 0; i < len(sRet); i++ {
		sumS += sRet[i]; sumM += mRet[i]
	}
	meanS, meanM := sumS/n, sumM/n
	var covar, varM float64
	for i := 0; i < len(sRet); i++ {
		covar += (sRet[i] - meanS) * (mRet[i] - meanM)
		varM += math.Pow(mRet[i]-meanM, 2)
	}
	if varM == 0 { return 0 }
	return covar / varM
}

func CalculateMetrics(ticker string) (avgAlpha5Y, rollAlpha1Y, avgBeta5Y, rollBeta1Y, histPctAlpha1Y, histPctBeta1Y float64, err error) {
	apiKey, err := getAPIKey()
	if err != nil { return 0, 0, 0, 0, 0, 0, err }
	stockPrices, err := fetchPrices(ticker, 1300, apiKey)
	if err != nil { return 0, 0, 0, 0, 0, 0, err }
	marketPrices, err := getGSPC(apiKey)
	if err != nil { return 0, 0, 0, 0, 0, 0, err }
	marketPriceMap := make(map[string]float64)
	for _, mp := range marketPrices { marketPriceMap[mp.Date] = mp.Price }
	var pS, pM []float64
	for _, sp := range stockPrices {
		if mp, exists := marketPriceMap[sp.Date]; exists {
			pS = append(pS, sp.Price); pM = append(pM, mp)
		}
	}
	if len(pS) < 2 { return 0, 0, 0, 0, 0, 0, fmt.Errorf("not enough aligned data") }
	var rS, rM []float64
	for i := 1; i < len(pS); i++ {
		rS = append(rS, (pS[i]-pS[i-1])/pS[i-1]); rM = append(rM, (pM[i]-pM[i-1])/pM[i-1])
	}
	riskFree := 0.04
	avgBeta5Y = calculateBeta(rS, rM)
	yearsTotal := float64(len(rS)) / 252.0
	cagrStock := math.Pow(pS[len(pS)-1]/pS[0], 1/yearsTotal) - 1
	cagrMarket := math.Pow(pM[len(pM)-1]/pM[0], 1/yearsTotal) - 1
	avgAlpha5Y = cagrStock - (riskFree + avgBeta5Y*(cagrMarket-riskFree))
	window := 252
	if len(pS) <= window { return avgAlpha5Y, avgAlpha5Y, avgBeta5Y, avgBeta5Y, 50.0, 50.0, nil }
	var hA, hB []float64
	for i := window; i < len(pS); i++ {
		b := calculateBeta(rS[i-window:i], rM[i-window:i])
		a := ((pS[i] / pS[i-window]) - 1) - (riskFree + b*((pM[i]/pM[i-window])-1-riskFree))
		hA = append(hA, a); hB = append(hB, b)
	}
	rollAlpha1Y = hA[len(hA)-1]; rollBeta1Y = hB[len(hB)-1]
	var cA, cB int
	for _, a := range hA { if a < rollAlpha1Y { cA++ } }
	for _, b := range hB { if b < rollBeta1Y { cB++ } }
	return avgAlpha5Y, rollAlpha1Y, avgBeta5Y, rollBeta1Y, (float64(cA)/float64(len(hA)))*100, (float64(cB)/float64(len(hB)))*100, nil
}