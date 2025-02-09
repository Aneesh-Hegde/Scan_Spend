export interface Product {
  ID: string;
  product_name: string;
  quantity: number;
  amount: number;
  Name: string
  category: string
  Date: string

}
export interface UploadResponse {
  filenames: []
}
export interface ProductResponse {
  product: Product[]
  total: number
}
