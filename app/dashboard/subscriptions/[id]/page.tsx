"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

// Sample data - would be fetched from API in a real app
const subscriptions = [
  {
    id: "1",
    name: "Netflix",
    price: "15.99",
    category: "Entertainment",
    billingCycle: "Monthly",
    startDate: "2023-01-15",
    description: "Premium plan with 4K streaming",
  },
  {
    id: "2",
    name: "Spotify",
    price: "9.99",
    category: "Music",
    billingCycle: "Monthly",
    startDate: "2022-05-10",
    description: "Family plan",
  },
]

const categories = [
  "Entertainment",
  "Music",
  "Software",
  "Shopping",
  "Cloud Storage",
  "Gaming",
  "Fitness",
  "News",
  "Food",
  "Other",
]

const billingCycles = ["Monthly", "Quarterly", "Yearly", "Weekly", "Biweekly", "Custom"]

export default function EditSubscriptionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    billingCycle: "",
    startDate: "",
    description: "",
  })

  useEffect(() => {
    // Simulate fetching subscription data
    const subscription = subscriptions.find((sub) => sub.id === params.id)

    if (subscription) {
      setFormData(subscription)
    } else {
      toast({
        title: "Subscription not found",
        description: "The subscription you're trying to edit doesn't exist.",
        variant: "destructive",
      })
      router.push("/dashboard/subscriptions")
    }
  }, [params.id, router, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Handle form submission
      toast({
        title: "Subscription updated",
        description: "Your subscription has been updated successfully.",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Subscription</h1>
        <p className="text-muted-foreground">Update the details of your subscription.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Make changes to your subscription information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subscription Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Netflix, Spotify, etc."
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="9.99"
                    className="pl-7"
                    required
                    value={formData.price}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value) => handleSelectChange("billingCycle", value)}
                >
                  <SelectTrigger id="billingCycle">
                    <SelectValue placeholder="Select billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingCycles.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Add notes about this subscription"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Subscription"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

