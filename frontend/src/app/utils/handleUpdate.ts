import api from '../utils/api'
import { Product } from '../types/types';

interface Update {
  updatedProduct: Product
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  setEditingProduct: (data: Product | null) => void
}

const HandleUpdate = ({ updatedProduct, setProducts, setEditingProduct }: Update): void => {
  setProducts((prevProducts) =>
    prevProducts.map((product) =>
      product.ID === updatedProduct.ID ? updatedProduct : product)
  )
  api.post(`edit/${updatedProduct.Name}/${updatedProduct.ID}`)
  setEditingProduct(null)
}
export default HandleUpdate
