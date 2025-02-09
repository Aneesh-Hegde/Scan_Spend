package states

type FileName struct {
	Filenames []string
}

var Files = FileName{
	Filenames: []string{},
}

type AllData struct {
	Products []Product
	Total    float64
}

var FilesProduct = make(map[string]AllData)

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
	ProductName string  `json:"product_name"`
	Quantity    float64 `json:"quantity"`
	Amount      float64 `json:"amount"`
	ID          string  `json:"id"`
	FileName    string  `json:"filename"`
	Category    string  `json:"category"`
	Date        string  `json:"date`
}
