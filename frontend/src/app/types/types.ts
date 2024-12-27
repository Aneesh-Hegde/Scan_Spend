export interface Product{
  id:string;
  productName: string;
  quantity: string;
  amount: string;
  filename: string

}
export interface UploadResponse{
  filenames: []
}
export interface ProductResponse{
  product:Product[]
  total: number
}
