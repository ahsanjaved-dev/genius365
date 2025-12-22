"use client"

import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function LeadsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage and track leads captured by your voice agents.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, email, or phone..."
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No leads yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Start capturing leads from your voice agents. Leads will appear here automatically when customers provide their information.
          </p>
          <Button className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Lead
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


