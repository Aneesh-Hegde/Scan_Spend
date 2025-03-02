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
  const [products,setProducts]=useState<Expense[]>([]);
  useEffect(() => {
    const test = async () => {


      const request = new GetProductsByUserRequest()
      const token = localStorage.getItem("token")
      const response = await api.get("/get-refresh-token", { withCredentials: true, })
      const refresh_token: string = response.data.refresh_token

      const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }

      productclient.getProductsByUser(request, requestmetadata, async (err, response) => {
        if (err) {
          console.error("Error updating profile:", err);
          // toast.error("Failed to update profile.");
          return;
        }
        const responseProducts: Expense[] = response.getProductsList().map((product: Product) => ({
          id: Math.random(), // gRPC might not have an "id", so generate one
          name: product.getProductName(),
          date: product.getDate(), // Extracts the date string
          category: product.getCategory(), // Extracts the category name
          quantity: product.getQuantity(), // Extracts quantity
          amount: product.getAmount(), // Extracts price
        }))
        setProducts(responseProducts)
        console.log(responseProducts)

        // toast.success("Profile updated successfully!");

      }).on("metadata", (metadata: any) => {
        const token: string | null = metadata["token"]
        console.log(token)
        if (token) {
          localStorage.setItem("token", token)
        }
      });
    }
    test()
  },[])
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Monthly Expense Tracker</h1>
      <div className="space-y-8">
        <ExpenseChart expenses={products}/>
        <ExpenseList products={products}/>
      </div>
    </main>
  )
}

