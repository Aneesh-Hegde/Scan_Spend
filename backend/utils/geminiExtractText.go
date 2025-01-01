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
	"strings"
)

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
							"Please extract the product name, quantity and amount from this text and format it as a json array of objects where each object has the fields 'product_name', 'quantity', and 'amount'.Also add category field for each product in easy words,.You can check for product name online to have close precision for category.Add category in broder perspective based on an expense tracker.Provide the output in JSON format without any markdown or backticks and each value should be in string. Here's the text:\n%s",
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
		log.Fatalf("Error marshaling request body: %v", err)
	}

	// Set the endpoint URL
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", apiKey)

	// Create a POST request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Send the request using http.Client
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error sending request: %v", err)
	}
	defer resp.Body.Close()

	// Read the response body
	respBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	// Check if the status code is OK (200)
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Error: received non-OK HTTP status: %d\nResponse: %s", resp.StatusCode, string(respBody))
	}

	// Print the raw response body for debugging (optional)
	// fmt.Println("Raw Response Body:", string(respBody))

	// Unmarshal the response into a Go struct
	var geminiResponse states.GeminiResponse
	err = json.Unmarshal(respBody, &geminiResponse)
	if err != nil {
		log.Fatalf("Error unmarshalling response: %v", err)
	}

	// Output the generated content
	if len(geminiResponse.Candidates) > 0 && len(geminiResponse.Candidates[0].Content.Parts) > 0 {
		// Print only the JSON formatted content (product name, quantity, amount)
		fmt.Println("Generated JSON Response:")
		fmt.Println(geminiResponse.Candidates[0].Content.Parts[0].Text)
	} else {
		fmt.Println("No generated content in the response.")
	}
	var products []states.Product
	jsonDataWithBackticks := geminiResponse.Candidates[0].Content.Parts[0].Text
	cleanedJSON := strings.TrimPrefix(jsonDataWithBackticks, "```json\n")
	cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	fmt.Println(cleanedJSON)
	err = json.Unmarshal([]byte(cleanedJSON), &products)
	if err != nil {
		log.Fatalf("Error unmarshalling JSON: %v", err)
	}

	return products, nil
}
