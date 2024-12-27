
import React, { useState, useEffect } from 'react';

const ProductList: React.FC<{ filename: string }> = ({ filename }) => {
  const [products, setProducts] = useState<any[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Send the request with the full filename (including extension)
        const response = await fetch(`http://localhost:1323/get-text/${filename}`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Assuming the response structure is { product: Array, total: number }
        setProducts(data.product); // Set the products list
        setTotal(data.total); // Set the total value
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (filename) {
      fetchProducts(); // Fetch product data when filename changes
    }
  }, [filename]); // Fetch data when filename is updated

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
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {products.map((prod, index) => (
            <tr key={index}>
              <td>{prod.product_name}</td>
              <td>{prod.quantity}</td>
              <td>{prod.amount}</td>
              <td>{prod.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total !== null && <p>Total: {total}</p>}
    </div>
  );
};

export default ProductList;

