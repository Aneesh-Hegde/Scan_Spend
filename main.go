package main

import (
	"fmt"
	"io"
	// "net/http"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/otiai10/gosseract/v2"
	"html/template"
	"log"
	"os"
	// "regexp"
	// "strings"
	"bytes"
	"encoding/json"
	"github.com/joho/godotenv"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

type FileName struct {
	Filenames []string
}

func upload(c echo.Context) error {
	// Read file from form data
	file, err := c.FormFile("file") // Make sure this key matches the frontend
	if err != nil {
		return c.JSON(400, map[string]string{"status": "error", "message": fmt.Sprintf("Error retrieving file: %v", err)})
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error opening file: %v", err)})
	}
	defer src.Close()

	// Ensure the uploads directory exists
	uploadDir := "uploads"
	err = os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error creating directory: %v", err)})
	}

	// Create the destination file path
	dst, err := os.Create(fmt.Sprintf("%s/%s", uploadDir, file.Filename))
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error creating file: %v", err)})
	}
	defer dst.Close()

	// Copy the content of the uploaded file to the destination file
	if _, err := io.Copy(dst, src); err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error copying file: %v", err)})
	}

	// Append the uploaded filename to the list
	files.Filenames = append(files.Filenames, file.Filename)
	err = os.Remove(file.Filename)
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error deleting source file: %v", err)})
	}
	// Return a success JSON response with the filename
	return c.JSON(200, map[string]string{"status": "success", "message": "Upload successful", "filename": file.Filename})
}

// func extractProductAndPrices(text string) ([]Product, error) {
// 	// Regular expression to capture product name and four numbers (MRP, Quantity, Price, Amount)
// 	re := regexp.MustCompile(`^([^\d]+)\s+\|\s+(\d+[.,]?\d{2})\s+(\d+[.,]?\d{2})\s+(\d+[.,]?\d{2})\s+(\d+[.,]?\d{2})`)
//
// 	// Split the text into lines
// 	lines := strings.Split(text, "\n")
//
// 	// Slice to store extracted product details for each line
// 	var products []Product
//
// 	// Iterate through each line
// 	for _, line := range lines {
// 		// Skip empty lines
// 		line = strings.TrimSpace(line)
// 		if len(line) == 0 {
// 			continue
// 		}
//
// 		// Find the match for each line
// 		matches := re.FindStringSubmatch(line)
//
// 		// If no match is found for the line, skip it
// 		if len(matches) < 6 {
// 			continue
// 		}
//
// 		// Extract the product name (first match)
// 		productName := strings.TrimSpace(matches[1])
//
// 		// Extract MRP, Quantity, Price, and Amount from the match groups
// 		var details Product
// 		details.ProductName = productName
// 		details.MRP = parseFloat(matches[2])
// 		details.Quantity = parseFloat(matches[3])
// 		details.Price = parseFloat(matches[4])
// 		details.Amount = parseFloat(matches[5])
//
// 		// Add the product to the products list
// 		products = append(products, details)
// 	}
//
// 	// Return the list of products
// 	return products, nil
// }
//
// // Helper function to parse strings to float
// func parseFloat(value string) float64 {
// 	// Replace commas with dots for consistent parsing
// 	value = strings.Replace(value, ",", ".", -1)
// 	var result float64
// 	_, err := fmt.Sscanf(value, "%f", &result)
// 	if err != nil {
// 		return 0
// 	}
// 	return result
// }

type ContentPart struct {
	Text string `json:"text"`
}

type Content struct {
	Parts []ContentPart `json:"parts"`
}

type RequestBody struct {
	Contents []Content `json:"contents"` // Only "contents" is required
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []ContentPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error string `json:"error"`
}
type Product struct {
	ProductName string `json:"product_name"`
	Quantity    string `json:"quantity"`
	Amount      string `json:"amount"`
	ID          string
	Name        string
}

func extractProductDataFromText(text string) ([]Product, error) {
	// Your Gemini API key (replace with actual key)
	apiKey := os.Getenv("API_KEY")

	// Create the request body for Gemini API
	// Construct the request body
	requestBody := RequestBody{
		Contents: []Content{
			{
				Parts: []ContentPart{
					{
						Text: fmt.Sprintf(
							"Please extract the product name, quantity and amount from this text and format it as a json array of objects where each object has the fields 'product_name', 'quantity', and 'amount'.Also add category field for each product.Provide the output in JSON format without any markdown or backticks and each value should be in string. Here's the text:\n%s",
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
	var geminiResponse GeminiResponse
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
	var products []Product
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

type TemplateData struct {
	Products []Product
}

type Templates struct {
	templates *template.Template
}

func (t *Templates) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

func newTemplate() *Templates {
	return &Templates{
		templates: template.Must(template.ParseGlob("views/*.html")),
	}
}

var status = map[string]string{
	"status": "no",
}
var files = FileName{
	Filenames: []string{},
}

type AllData struct {
	Products []Product
	Total    float64
}

var filesProduct = make(map[string]AllData)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"}, // Your frontend URL
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE},
		AllowHeaders: []string{echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	// Serve static files (adjust path as necessary)
	e.Static("/uploads", "uploads")

	// Route to display the list of uploaded files (rendering logic removed)
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{"files": files.Filenames})
	})

	// Route for file upload
	e.POST("/upload", upload)

	// Route to serve a file (adjust file name and path as needed)
	e.GET("/file", func(c echo.Context) error {
		c.Attachment("celebi.png", "celebi.png")
		return c.String(http.StatusOK, "File served")
	})

	// Route to extract text from an image file (using OCR)
	e.POST("/get-text/:file", func(c echo.Context) error {
		filename := c.Param("file")
		client := gosseract.NewClient()
		defer client.Close()

		// Set the image file for OCR
		err := client.SetImage("uploads/" + filename)
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to set image")
		}

		// Perform OCR to extract text
		text, err := client.Text()
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to extract text")
		}

		// Extract product data from text and calculate total
		extractedData, err := extractProductDataFromText(text)
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to extract product data")
		}

		var data []map[string]string
		var id = 0
		var total = 0.0

		// Process extracted data
		for i := range extractedData {
			id++
			extractedData[i].ID = strconv.Itoa(id)
			extractedData[i].Name = filename
			quantity, _ := strconv.ParseFloat(extractedData[i].Quantity, 64)
			amount, _ := strconv.ParseFloat(extractedData[i].Amount, 64)
			total += quantity * amount
		}

		// Store the extracted product data and total
		filesProduct[filename] = AllData{Products: extractedData, Total: total}

		// Convert extracted data for rendering
		for _, product := range extractedData {
			temp := map[string]string{
				"ProductName": product.ProductName,
				"Quantity":    product.Quantity,
				"Amount":      product.Amount,
				"ID":          product.ID,
				"Filename":    product.Name,
			}
			data = append(data, temp)
		}

		// Return the extracted data and total
		return c.JSON(http.StatusOK, map[string]interface{}{"product": extractedData, "total": total})
	})

	// Route to edit a product
	e.POST("/edit/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total
		var editProduct Product

		// Find the product to edit
		for _, data := range editingData.Products {
			if data.ID == id {
				editProduct = data
				quantity, _ := strconv.ParseFloat(data.Quantity, 64)
				amount, _ := strconv.ParseFloat(data.Amount, 64)
				total -= quantity * amount
				editingData.Total = total
				break
			}
		}

		// Return the product to edit
		return c.JSON(http.StatusOK, map[string]Product{"product": editProduct})
	})

	// Route to update a product
	e.POST("/update/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		productname := c.FormValue("product")
		quantity := c.FormValue("quantity")
		amount := c.FormValue("amount")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total
		var editedData Product

		// Find and update the product
		for _, data := range editingData.Products {
			if data.ID == id {
				data.ProductName = productname
				data.Quantity = quantity
				data.Amount = amount
				quantity, _ := strconv.ParseFloat(data.Quantity, 64)
				amount, _ := strconv.ParseFloat(data.Amount, 64)
				total += quantity * amount
				editingData.Total = total
				editedData = data
				break
			}
		}

		// Return the updated product
		return c.JSON(http.StatusOK, editedData)
	})

	// Route to delete a product
	e.DELETE("/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total

		// Find and delete the product
		for i, data := range editingData.Products {
			if data.ID == id {
				quantity, _ := strconv.ParseFloat(data.Quantity, 64)
				amount, _ := strconv.ParseFloat(data.Amount, 64)
				total -= quantity * amount
				editingData.Products = append(editingData.Products[:i], editingData.Products[i+1:]...)
				editingData.Total = total
				filesProduct[filename] = editingData
				break
			}
		}

		return c.String(http.StatusOK, "Product deleted")
	})

	// Start the server
	e.Logger.Fatal(e.Start(":1323"))
}
