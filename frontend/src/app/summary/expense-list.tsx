
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Expense } from "../types/types"

const expenses = [
  { id: 1, date: "2023-05-01", category: "Food", description: "Grocery shopping", quantity: 1, amount: 75.5 },
  { id: 2, date: "2023-05-03", category: "Transportation", description: "Gas", quantity: 1, amount: 40.0 },
  { id: 3, date: "2023-05-05", category: "Entertainment", description: "Movie tickets", quantity: 1, amount: 25.0 },
  { id: 4, date: "2023-05-10", category: "Utilities", description: "Electricity bill", quantity: 1, amount: 80.0 },
  { id: 5, date: "2023-05-15", category: "Food", description: "Dinner out", quantity: 1, amount: 60.0 },
]

export default function ExpenseList({ products }: { products: Expense[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              {/* <TableHead>Description</TableHead> */}
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.name}</TableCell>
                <TableCell>{expense.date}</TableCell>
                <TableCell>{expense.category}</TableCell>
                {/* <TableCell>{expense.description}</TableCell> */}
                <TableCell className="px-8">{expense.quantity}</TableCell>
                <TableCell className="text-right">&#8377;{expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

