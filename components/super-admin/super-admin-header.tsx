"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sun, Moon, Monitor, LogOut } from "lucide-react"
import type { SuperAdmin } from "@/types/database.types"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type ThemeMode = "light" | "dark" | "system"

interface SuperAdminHeaderProps {
  superAdmin: SuperAdmin
  isDark: boolean
  setIsDark: (dark: boolean) => void
}

export function SuperAdminHeader({
  superAdmin,
  isDark,
  setIsDark,
}: SuperAdminHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [themeMode, setThemeMode] = useState<ThemeMode>("system")
  const [mounted, setMounted] = useState(false)

  // Load theme mode on mount
  useEffect(() => {
    setMounted(true)
    const savedMode = localStorage.getItem("superadmin-theme-mode") as ThemeMode | null
    if (savedMode) {
      setThemeMode(savedMode)
      if (savedMode !== "system") {
        setIsDark(savedMode === "dark")
      } else {
        // If system mode, get current system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setIsDark(prefersDark)
      }
    }
  }, [setIsDark])

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply if system mode is selected
      if (themeMode === "system") {
        setIsDark(e.matches)
      }
    }

    // Use addEventListener for better browser compatibility
    mediaQuery.addEventListener("change", handleChange)
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [themeMode, setIsDark])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/super-admin/login")
    router.refresh()
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    localStorage.setItem("superadmin-theme-mode", mode)

    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setIsDark(prefersDark)
    } else {
      setIsDark(mode === "dark")
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Theme Selector - Three Buttons */}
      <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
        <Button
          variant={themeMode === "light" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleThemeChange("light")}
          className="w-9 h-9 p-0"
          title="Light mode"
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant={themeMode === "system" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleThemeChange("system")}
          className="w-9 h-9 p-0"
          title="System mode"
          aria-label="System mode"
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          variant={themeMode === "dark" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleThemeChange("dark")}
          className="w-9 h-9 p-0"
          title="Dark mode"
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </Button>
      </div>

      {/* User Menu - Minimal and Clean */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 hover:bg-muted">
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {superAdmin.first_name && superAdmin.last_name
                ? `${superAdmin.first_name} ${superAdmin.last_name}`
                : superAdmin.email}
            </span>
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">
                {superAdmin.first_name && superAdmin.last_name
                  ? `${superAdmin.first_name} ${superAdmin.last_name}`
                  : superAdmin.email}
              </p>
              <p className="text-xs text-muted-foreground">{superAdmin.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive cursor-pointer focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

