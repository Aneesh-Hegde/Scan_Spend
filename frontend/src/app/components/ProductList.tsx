"use client"
import React from "react";
import { Product } from "../types/types";
type ProductListProps = {
  products: Product[];
  onEdit: (product: Product) => void;  // Update the type to receive the whole product for editing
};

const ProductList: React.FC<ProductListProps> = ({ products, onEdit }) => {
  return (
    <div>
      <h2>Product List</h2>
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={index}>
              <td>{product.product_name}</td>
              <td>{product.quantity}</td>
              <td>{product.amount}</td>
              {/* <td>{product.category}</td> */}
              <td>
                <button onClick={() => onEdit(product)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;

