"use client"

import { useState, useCallback } from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).slice(2)
    const toast: Toast = { id, type, message, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((message: string) => addToast("success", message), [addToast])

  const error = useCallback((message: string) => addToast("error", message), [addToast])

  const info = useCallback((message: string) => addToast("info", message), [addToast])

  const warning = useCallback((message: string) => addToast("warning", message), [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}
