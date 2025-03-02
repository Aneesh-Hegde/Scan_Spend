"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Expense } from "../types/types"

type ExpenseChartProps = {
  expenses: Expense[] // Accepts an array of Expense objects
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
]

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
  // Aggregate expenses by category
  const data = useMemo(() => {
    const categoryMap = new Map<string, number>()

    expenses.forEach(({ category, amount }) => {
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
    })

    return Array.from(categoryMap, ([name, value]) => ({ name, value }))
  }, [expenses])

  // Calculate total expenses
  const totalExpenses = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Expense Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <div className="flex flex-col justify-center items-center">
            <ChartContainer
              config={data.reduce((acc, item, index) => {
                acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] }
                return acc
              }, {} as Record<string, { label: string; color: string }>)} // Adding 'config' prop
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Expense Summary */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold">Total Expenses</h3>
              <p className="text-4xl font-bold text-primary">&#8377;{totalExpenses.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {data.map((item, index) => (
                <div key={item.name} className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">{item.name}</p>
                  <p className="text-lg font-semibold" style={{ color: COLORS[index % COLORS.length] }}>
                    &#8377;{item.value.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{((item.value / totalExpenses) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

