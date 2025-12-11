"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Bot,
  Clock,
  DollarSign,
} from "lucide-react"
import type { Department } from "@/types/database.types"
import Link from "next/link"

interface DepartmentCardProps {
  department: Department
  onDelete: (department: Department) => void
}

export function DepartmentCard({ department, onDelete }: DepartmentCardProps) {
  const limits = department.resource_limits as any

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">{department.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">/{department.slug}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                href={`/departments/${department.id}`}
                className="flex items-center cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(department)}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {department.description || "No description provided"}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
            <Bot className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Agents</p>
              <p className="font-semibold text-sm">
                {department.total_agents}
                {limits?.max_agents && (
                  <span className="text-muted-foreground font-normal">/{limits.max_agents}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="font-semibold text-sm">
                {department.total_users}
                {limits?.max_users && (
                  <span className="text-muted-foreground font-normal">/{limits.max_users}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Minutes</p>
              <p className="font-semibold text-sm">
                {department.current_month_minutes?.toFixed(0) || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Cost</p>
              <p className="font-semibold text-sm">
                ${department.current_month_cost?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/departments/${department.id}`}>
            <Pencil className="mr-2 h-3 w-3" />
            Manage Department
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
