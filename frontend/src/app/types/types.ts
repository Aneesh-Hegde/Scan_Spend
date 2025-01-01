export interface Product {
  ID: string;
  product_name: string;
  quantity: string;
  amount: string;
  Name: string
  category: string

}
export interface UploadResponse {
  filenames: []
}
export interface ProductResponse {
  product: Product[]
  total: number
}
