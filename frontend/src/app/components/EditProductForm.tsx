
"use client";
import React, { useState } from "react";
import { Product } from "../types/types";

interface EditProductFormProps {
  product: Product;
  onUpdate: (updatedProduct: Product) => void;
}

const EditProductForm: React.FC<EditProductFormProps> = ({ product, onUpdate }) => {
  const [formData, setFormData] = useState(product);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData)
    onUpdate(formData); // Send updated product back to parent
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Edit Product</h3>
      <div>
        <label>Product Name:</label>
        <input
          name="product_name"
          value={formData.product_name}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Quantity:</label>
        <input
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Amount:</label>
        <input
          name="amount"
          value={formData.amount}
          onChange={handleChange}
        />
      </div>
      {/* <div> */}
      {/*   <label>Category:</label> */}
      {/*   <input */}
      {/*     name="category" */}
      {/*     value={formData.category} */}
      {/*     onChange={handleChange} */}
      {/*   /> */}
      {/* </div> */}
      <button type="submit">Save</button>
    </form>
  );
};

export default EditProductForm;

