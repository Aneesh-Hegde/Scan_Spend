import React, { useState, useEffect } from 'react'
import { ProductResponse } from '../types/types'
import api from '../utils/api'

const ProductList: React.FC<{ filename: string }> = ({ filename }) => {
  const [products, setProducts] = useState<ProductResponse | null>(null)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.post<ProductResponse>(`/get-text/${filename}`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [filename]);

  if (!products) {
    return <p>Loading products...</p>;
  }

  return (
    <div>
      <h2>Products in {filename}</h2>
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {products.product.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.productName}</td>
              <td>{prod.quantity}</td>
              <td>{prod.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Total: {products.total}</p>
    </div>
  );
}
export default ProductList;
