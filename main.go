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
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

type FileName struct {
	Filenames []string
}

func upload(c echo.Context) error {
	// Read form fields
	// name := c.FormValue("name")
	// email := c.FormValue("email")

	//-----------
	// Read file
	//-----------

	// Source
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// Destination
	dst, err := os.Create(file.Filename)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}
	files.Filenames = append(files.Filenames, file.Filename)
	c.Render(200, "form", nil)
	return c.Render(200, "files", files)
	// return c.HTML(http.StatusOK, fmt.Sprintf("<p>File %s uploaded successfully with fields name=%s and email=%s.</p>", file.Filename, name, email))
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
	apiKey := "API_KEY"

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
	e := echo.New()
	e.Renderer = newTemplate()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	// e.Static("/", "public")
	e.GET("/", func(c echo.Context) error {
		return c.Render(200, "index", files)
	})

	e.POST("/upload", upload)

	e.GET("/file", func(c echo.Context) error {
		c.Attachment("celebi.png", "celebi.png")
		return c.Render(200, "index", nil)
	})

	// 	e.POST("get-text/:file",func(c echo.Context)error{
	// 		filename:=c.Param("file")
	// 		client := gosseract.NewClient()
	// 		defer client.Close()
	//
	// 		err := client.SetImage(filename)
	// 		if err != nil {
	// 			log.Fatalf("Failed to set image: %v", err)
	// 		}
	//
	// 		text, err := client.Text()
	// 		if err != nil {
	// 			log.Fatalf("Failed to extract text: %v", err)
	// 		}
	//
	// 		fmt.Println("Extracted Text:")
	// 		fmt.Println(text)
	//
	// // 		products, err := extractProductAndPrices(text)
	// // 	if err != nil {
	// // 		fmt.Println("Error:", err)
	// // 	}
	// //
	// // data := struct {
	// // 		Products []Product
	// // 	}{
	// // 		Products: products,
	// // 	}
	//
	// 		// return c.Render(200,"text",data)
	// 		return c.Render(200,"text",map[string]string{"Text":text})
	//
	// 	})

	e.POST("/get-text/:file", func(c echo.Context) error {
		filename := c.Param("file")
		fmt.Println("Received ID:", filename)
		client := gosseract.NewClient()
		defer client.Close()

		err := client.SetImage(filename)
		if err != nil {
			log.Fatalf("Failed to set image: %v", err)
		}

		text, err := client.Text()
		if err != nil {
			log.Fatalf("Failed to extract text: %v", err)
		}

		fmt.Println("Extracted Text:")
		fmt.Println(text)

		// 	products, err := ExtractDataFromText(text)
		// if err != nil {
		// 	return c.String(http.StatusInternalServerError, fmt.Sprintf("Error: %v", err))
		// }
		//
		// Print the extracted products (you can print to console or log)
		// fmt.Println("Extracted Products:")
		// for i, product := range products {
		// 	fmt.Printf("Product %d:\n", i+1)
		// 	for key, value := range product {
		// 		fmt.Printf("  %s: %s\n", key, value)
		// 	}
		// 	fmt.Println()
		// }
		extractedData, err := extractProductDataFromText(text)
		if err != nil {
			fmt.Println("Error occured")
		}
		var data []map[string]string

		var id = 0
		var total = 0.0
		for i := range extractedData {
			id++
			extractedData[i].ID = strconv.Itoa(id)
			extractedData[i].Name = filename
			quantity, _ := strconv.ParseFloat(extractedData[i].Quantity, 64)
			amount, _ := strconv.ParseFloat(extractedData[i].Amount, 64)
			total += quantity * amount
		}
		filesProduct[filename] = AllData{Products: extractedData, Total: total}
		for _, product := range extractedData {
			temp := map[string]string{
				"ProductName": product.ProductName,
				"Quantity":    product.Quantity,
				"Amount":      product.Amount,
				"ID":          product.ID,
				"Filename":    product.Name,
			}
			fmt.Println(product.ProductName, product.Quantity, product.Amount, product.ID, product.Name)
			data = append(data, temp)
		}

		for _, product := range data {
			fmt.Println(product["ProductName"], product["Quantity"], product["Amount"])
		}
		return c.Render(200, "text", map[string]interface{}{"product": extractedData, "total": total})
	})

	e.POST("/edit/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total
		var editProduct Product
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
		return c.Render(200, "edit", map[string]Product{"product": editProduct})
	})
	e.POST("/update/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		productname := c.FormValue("product")
		quantity := c.FormValue("quantity")
		amount := c.FormValue("amount")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total
		var editedData Product
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
		return c.Render(200, "product", editedData)
	})

	e.DELETE("/:file/:id", func(c echo.Context) error {
		filename := c.Param("file")
		id := c.Param("id")
		editingData := filesProduct[filename]
		total := filesProduct[filename].Total
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
		return c.String(200, "")
	})

	// e.POST("")//update total

	e.Logger.Fatal(e.Start(":1323"))

}
