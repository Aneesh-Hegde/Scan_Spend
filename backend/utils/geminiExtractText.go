package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

type RawProduct struct {
	ProductName string `json:"product_name"`
	Quantity    string `json:"quantity"`
	Amount      string `json:"amount"`
	Category    string `json:"category"`
	Date        string `json:"date"`
}

func ExtractProductDataFromText(text string) ([]states.Product, error) {
	// Your Gemini API key (replace with actual key)
	apiKey := os.Getenv("API_KEY")

	// Create the request body for Gemini API
	// Construct the request body
	requestBody := states.RequestBody{
		Contents: []states.Content{
			{
				Parts: []states.ContentPart{
					{
						Text: fmt.Sprintf(
							"Please extract the product name, quantity and amount from this text and format it as a json array of objects where each object has the fields 'product_name', 'quantity', and 'amount' and 'date'(if possible in format dd/mm/yyyy).Also add category field for each product in easy words,.You can check for product name online to have close precision for category.Add category in broder perspective based(like food,household,etc) on an expense tracker.Provide the output in JSON format without any markdown or backticks and each value should be in string. Here's the text:\n%s",
							text,
						),
					},
				},
			},
		},
	}

	// Marshal the request body into JSON

	body, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling request body: %v", err)
	}

	// Set the endpoint URL
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", apiKey)

	// Create a POST request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Error creating request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Send the request using http.Client
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v", err)
	}
	defer resp.Body.Close()

	// Read the response body
	respBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
	}

	// Check if the status code is OK (200)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Error: received non-OK HTTP status: %d\nResponse: %s", resp.StatusCode, string(respBody))
	}

	// Print the raw response body for debugging (optional)
	// fmt.Println("Raw Response Body:", string(respBody))

	// Unmarshal the response into a Go struct
	var geminiResponse states.GeminiResponse
	err = json.Unmarshal(respBody, &geminiResponse)
	if err != nil {
		log.Printf("Error unmarshalling response: %v", err)
	}

	// Output the generated content
	if len(geminiResponse.Candidates) > 0 && len(geminiResponse.Candidates[0].Content.Parts) > 0 {
		// Print only the JSON formatted content (product name, quantity, amount)
		fmt.Println("Generated JSON Response:")
		fmt.Println(geminiResponse.Candidates[0].Content.Parts[0].Text)
	} else {
		fmt.Println("No generated content in the response.")
	}
	jsonDataWithBackticks := geminiResponse.Candidates[0].Content.Parts[0].Text
	cleanedJSON := strings.TrimPrefix(jsonDataWithBackticks, "```json\n")
	cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	fmt.Println(cleanedJSON)
	var rawProducts []RawProduct
	err = json.Unmarshal([]byte(cleanedJSON), &rawProducts)
	if err != nil {
		log.Printf("Error unmarshalling JSON: %v", err)
	}
	// Convert rawProducts to final products with numeric fields
	var products []states.Product
	for _, raw := range rawProducts {
		quantity, err := strconv.ParseFloat(raw.Quantity, 64)
		if err != nil {
			log.Printf("Error converting quantity to float: %v", err)
			continue // Skip invalid entries
		}

		amount, err := strconv.ParseFloat(raw.Amount, 64)
		if err != nil {
			log.Printf("Error converting amount to float: %v", err)
			continue // Skip invalid entries
		}

		products = append(products, states.Product{
			ProductName: raw.ProductName,
			Quantity:    quantity,
			Amount:      amount,
			Date:        raw.Date,
			Category:    raw.Category,
		})
	}

	return products, nil
}
