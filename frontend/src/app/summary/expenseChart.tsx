"use client"

import { useState, useMemo } from "react"
import { format, parseISO, isSameMonth, isSameYear } from "date-fns"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts"
import { useSwipeable } from "react-swipeable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Expense } from "../types/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ExpenseChartProps = {
  expenses: Expense[]
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const CHART_TYPES = ["Pie Chart", "Bar Chart", "Line Chart"]

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
  const [currentChart, setCurrentChart] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedDate, setSelectedDate] = useState("All")

  // Get unique months and years from expenses
  const uniqueDates = useMemo(() => {
    const months = new Set<string>()

    expenses.forEach(({ date }) => {
      const parsedDate = parseISO(date)
      months.add(format(parsedDate, "yyyy-MM")) // Format as "YYYY-MM"
    })

    return Array.from(months)
  }, [expenses])

  // Filter expenses by category and date
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const isCategoryMatch = selectedCategory === "All" || expense.category === selectedCategory
      const isDateMatch =
        selectedDate === "All" || isSameMonth(parseISO(expense.date), parseISO(`${selectedDate}-01`))

      return isCategoryMatch && isDateMatch
    })
  }, [selectedCategory, selectedDate, expenses])

  // Aggregate expenses by category
  const data = useMemo(() => {
    const categoryMap = new Map<string, number>()

    filteredExpenses.forEach(({ category, amount }) => {
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
    })

    return Array.from(categoryMap, ([name, value]) => ({ name, value }))
  }, [filteredExpenses])

  // Calculate total expenses
  const totalExpenses = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  // Swipeable handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => setCurrentChart((prev) => (prev + 1) % CHART_TYPES.length),
    onSwipedRight: () => setCurrentChart((prev) => (prev - 1 + CHART_TYPES.length) % CHART_TYPES.length),
    trackMouse: true,
  })

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">Expense Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={() => setCurrentChart((prev) => (prev - 1 + CHART_TYPES.length) % CHART_TYPES.length)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-xl font-semibold">{CHART_TYPES[currentChart]}</h3>
          <Button variant="outline" onClick={() => setCurrentChart((prev) => (prev + 1) % CHART_TYPES.length)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* 🔽 Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Category Filter */}
          <Select onValueChange={setSelectedCategory} value={selectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {Array.from(new Set(expenses.map(expense => expense.category))).map(category => (
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

        <div {...handlers} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 📊 Chart Display */}
          <div className="flex flex-col justify-center items-center">
            {data.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {currentChart === 0 ? (
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name) => [`${((value / totalExpenses) * 100).toFixed(1)}%`, name]} />
                      {/* <Legend /> */}
                    </PieChart>
                  ) : currentChart === 1 ? (
                    <BarChart data={data}>
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" padding={{ left: 20, right: 20 }} />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value">
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={data.length === 1 ? [{ name: "", value: 0 }, ...data] : data}>
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" padding={{ left: 30, right: 30 }} />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground">No expense data available.</p>
            )}
          </div>

          {/* 📄 Expense Summary */}
          <div className="grid grid-cols-2 gap-4">
            {data.map((item, index) => (
              <Card key={item.name} className="p-3">
                {/* 🏷️ Category Name (Subtle color indicator instead of just muted) */}
                <p className="text-sm font-medium" style={{ color: COLORS[index % COLORS.length] }}>
                  {item.name}
                </p>

                {/* 💰 Expense Amount (Category color retained) */}
                <p className="text-lg font-semibold" style={{ color: COLORS[index % COLORS.length] }}>
                  ₹{item.value.toFixed(2)}
                </p>

                {/* 📊 Percentage of Total (Muted text for contrast) */}
                <p className="text-xs text-muted-foreground">
                  {((item.value / totalExpenses) * 100).toFixed(1)}%
                </p>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

