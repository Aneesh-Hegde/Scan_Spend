"use client";

import React, { useState } from "react";
import type { Product } from "../types/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditProductFormProps {
  product: Product;
  onUpdateAction: (updatedProduct: Product) => void;
  onCancelAction: () => void;
}

export default function EditProductForm({ product, onUpdateAction, onCancelAction }: EditProductFormProps) {
  const [name, setName] = useState(product.product_name);
  const [category, setCategory] = useState(product.category);
  const [quantity, setQuantity] = useState(product.quantity);
  const [date, setDate] = useState(product.Date);
  const [price, setPrice] = useState(product.amount.toString());
  console.log(date)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure price is a valid number
    const parsedPrice = Number.parseFloat(price);
    if (isNaN(parsedPrice)) return;

    onUpdateAction({ ...product, product_name: name, amount: parsedPrice, quantity: quantity, category: category, Date: date });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Name" />
      <Input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category Name" />
      <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} placeholder="Quantity" />
      <Input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price"
        step="0.01"
      />

      <div className="space-x-2">
        <Button type="submit">Update</Button>
        <Button type="button" variant="outline" onClick={onCancelAction}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

