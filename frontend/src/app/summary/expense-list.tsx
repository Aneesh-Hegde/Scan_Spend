"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Expense } from "../types/types"
import { format, parseISO, isSameMonth } from "date-fns"

// 🎨 Define a consistent color scheme for categories
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedDate, setSelectedDate] = useState<string>("All")

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    return [...new Set(expenses.map((expense) => expense.category))]
  }, [expenses])

  // 🎨 Map each category to a consistent color
  const categoryColors = useMemo(() => {
    return uniqueCategories.reduce((acc, category, index) => {
      acc[category] = COLORS[index % COLORS.length] // Assign colors cyclically
      return acc
    }, {} as Record<string, string>)
  }, [uniqueCategories])

  // Get unique months/years for filtering
  const uniqueDates = useMemo(() => {
    const months = new Set<string>()
    expenses.forEach(({ date }) => {
      const parsedDate = parseISO(date)
      months.add(format(parsedDate, "yyyy-MM")) // Format as "YYYY-MM"
    })
    return Array.from(months)
  }, [expenses])

  // 🏷️ Filter expenses based on selected category and date
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const isCategoryMatch = selectedCategory === "All" || expense.category === selectedCategory
      const isDateMatch =
        selectedDate === "All" || isSameMonth(parseISO(expense.date), parseISO(`${selectedDate}-01`))

      return isCategoryMatch && isDateMatch
    })
  }, [selectedCategory, selectedDate, expenses])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 🔽 Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Category Filter */}
          <Select onValueChange={setSelectedCategory} value={selectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select onValueChange={setSelectedDate} value={selectedDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {uniqueDates.map((date) => (
                <SelectItem key={date} value={date}>{format(parseISO(`${date}-01`), "MMMM yyyy")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 📊 Expense Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.name}</TableCell>
                  <TableCell>{format(parseISO(expense.date), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {/* 🎨 Category label with consistent color */}
                    <span
                      className="px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: categoryColors[expense.category] }}
                    >
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-8">{expense.quantity}</TableCell>
                  <TableCell className="text-right">&#8377;{expense.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

