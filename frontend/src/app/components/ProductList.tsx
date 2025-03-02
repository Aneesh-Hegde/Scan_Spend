
import { useEffect, useState } from "react"
import type { Product } from "../types/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import EditProductForm from "./EditProductForm"

interface ProductListProps {
  products: Product[]
  onUpdate: (updatedProduct: Product) => void
  onSave: () => void
}

export default function ProductList({ products, onUpdate, onSave }: ProductListProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  useEffect(() => {
    setEditingProduct(null)
  }, [products])
  console.log(products)
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Uploaded Products</h2>
      {products.length === 0 ? (
        <p>No products to display</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.ID}>
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>&#8377;{product.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button onClick={() => setEditingProduct(product)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button className="mt-4" onClick={onSave}>
            Save Products
          </Button>
        </>
      )}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onUpdateAction={(updatedProduct) => {
            onUpdate(updatedProduct)
            setEditingProduct(null)
          }}
          onCancelAction={() => setEditingProduct(null)}
        />
      )}
    </div>
  )
}


