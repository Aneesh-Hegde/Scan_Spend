
"use client"

import ExpenseChart from "./expenseChart"
import ExpenseList from "./expense-list"
import { useEffect, useState } from "react"
import { Metadata } from "grpc-web"
import { GetProductsByUserRequest, Product } from "../grpc_schema/product_pb"
import api from "../utils/api"
import productclient from "../utils/productservice"
import { Expense } from "../types/types"

export default function Home() {
  const [products, setProducts] = useState<Expense[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      const request = new GetProductsByUserRequest()
      const token = localStorage.getItem("token")
      const response = await api.get("/get-refresh-token", { withCredentials: true })
      const refresh_token: string = response.data.refresh_token
      const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token }

      productclient.getProductsByUser(request, requestMetadata, async (err, response) => {
        if (err) {
          console.error("Error fetching products:", err)
          return
        }
        const responseProducts: Expense[] = response.getProductsList().map((product: Product) => ({
          id: Math.random(),
          name: product.getProductName(),
          date: product.getDate(),
          category: product.getCategory(),
          quantity: product.getQuantity(),
          amount: product.getAmount(),
        }))
        setProducts(responseProducts)
      }).on("metadata", (metadata: any) => {
        const token: string | null = metadata["token"]
        if (token) {
          localStorage.setItem("token", token)
        }
      })
    }
    fetchProducts()
  }, [])

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Monthly Expense Tracker</h1>
      <div className="space-y-8">
        <ExpenseChart expenses={products} />
        <ExpenseList expenses={products} />
      </div>
    </main>
  )
}

