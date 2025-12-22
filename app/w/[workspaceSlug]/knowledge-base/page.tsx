"use client"

import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Plus, Search, FileText, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function KnowledgeBasePage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage documents and information your AI agents can reference.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No documents yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mt-2">
            Upload documents, FAQs, and product information to help your AI agents provide accurate answers.
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


