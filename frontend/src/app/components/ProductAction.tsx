"use client"
import React, { useState } from 'react';
import api from '../utils/api';

interface ProductActionsProps {
  filename: string;
  productId: string;
  onProductUpdate: (updatedProduct: any) => void; // Callback to update the product list
}

const ProductActions: React.FC<ProductActionsProps> = ({ filename, productId, onProductUpdate }) => {
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch product for editing
  const fetchProductForEdit = async () => {
    try {
      const response = await api.post(`http://localhost:1323/edit/${filename}/${productId}`);
      const product = response.data.product;
      setProductName(product.productName);
      setQuantity(product.quantity);
      setAmount(product.amount);
      setEditMode(true);
    } catch (error) {
      setErrorMessage('Failed to fetch product for editing');
    }
  };

  // Update product
  const handleUpdateProduct = async () => {
    try {
      const response = await api.post(`/update/${filename}/${productId}`, {
        product: productName,
        quantity,
        amount,
      });

      if (response.status === 200) {
        onProductUpdate(response.data); // Update the product list in the parent component
        setEditMode(false); // Close edit mode
      }
    } catch (error) {
      setErrorMessage('Failed to update product');
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    try {
      await api.delete(`/${filename}/${productId}`);
      onProductUpdate(null); // Trigger product list update in parent
    } catch (error) {
      setErrorMessage('Failed to delete product');
    }
  };

  return (
    <div>
      {!editMode ? (
        <div>
          <button onClick={fetchProductForEdit}>Edit</button>
          <button onClick={handleDeleteProduct}>Delete</button>
        </div>
      ) : (
        <div>
          <h3>Edit Product</h3>
          <div>
            <label>Product Name:</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div>
            <label>Quantity:</label>
            <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label>Amount:</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <button onClick={handleUpdateProduct}>Update</button>
          <button onClick={() => setEditMode(false)}>Cancel</button>
        </div>
      )}
      {errorMessage && <p>{errorMessage}</p>}
    </div>
  );
};

export default ProductActions;

