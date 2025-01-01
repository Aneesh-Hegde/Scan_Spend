"use client"
import React, { useState } from "react";
import { Product } from "../types/types";
type ProductListProps = {
  products: Product[];
  onUpdate: (onUpdate: Product) => void;  // Update the type to receive the whole product for editing
};

const ProductList: React.FC<ProductListProps> = ({ products, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    setEditingId(product.ID)
    setFormData(product)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    if (!formData) return
    onUpdate(formData)
    setEditingId(null)
  }
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
          {products.map((product) => (
            <tr key={product.ID}>
              {editingId === product.ID ? (
                <>
                  <td>
                    <input
                      type="text"
                      name="product_name"
                      value={formData?.product_name || ""}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="quantity"
                      value={formData?.quantity || ""}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="amount"
                      value={formData?.amount || ""}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      name="category"
                      value={formData?.category || ""}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <button onClick={handleSave}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{product.product_name}</td>
                  <td>{product.quantity}</td>
                  <td>{product.amount}</td>
                  <td>{product.category}</td>
                  <td>
                    <button onClick={() => handleEdit(product)}>Edit</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;

