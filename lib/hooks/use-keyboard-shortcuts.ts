"use client"

/**
 * Keyboard Shortcuts Hook
 * Phase 8.4.3: Add keyboard navigation and shortcuts
 *
 * Provides keyboard shortcut handling for power users.
 */

import { useEffect, useCallback, useRef } from "react"

// ============================================================================
// TYPES
// ============================================================================

type KeyModifier = "ctrl" | "alt" | "shift" | "meta"
type KeyCombo = string // e.g., "ctrl+k", "shift+?", "escape"

interface ShortcutConfig {
  /** Key combination (e.g., "ctrl+k", "shift+/") */
  key: KeyCombo
  /** Handler function */
  handler: (event: KeyboardEvent) => void
  /** Description for help menu */
  description?: string
  /** Prevent default browser behavior */
  preventDefault?: boolean
  /** Only trigger when no input is focused */
  ignoreWhenInputFocused?: boolean
}

interface ShortcutOptions {
  /** Enable/disable all shortcuts */
  enabled?: boolean
  /** Scope for shortcuts (for conditional enabling) */
  scope?: string
}

// ============================================================================
// PARSE KEY COMBO
// ============================================================================

function parseKeyCombo(combo: KeyCombo): {
  key: string
  modifiers: Set<KeyModifier>
} {
  const parts = combo.toLowerCase().split("+")
  const modifiers = new Set<KeyModifier>()
  let key = ""

  for (const part of parts) {
    if (part === "ctrl" || part === "control") {
      modifiers.add("ctrl")
    } else if (part === "alt" || part === "option") {
      modifiers.add("alt")
    } else if (part === "shift") {
      modifiers.add("shift")
    } else if (part === "meta" || part === "cmd" || part === "command") {
      modifiers.add("meta")
    } else {
      key = part
    }
  }

  return { key, modifiers }
}

function matchesKeyCombo(
  event: KeyboardEvent,
  combo: { key: string; modifiers: Set<KeyModifier> }
): boolean {
  // Check key
  const eventKey = event.key.toLowerCase()
  const keyMatches =
    eventKey === combo.key ||
    event.code.toLowerCase() === combo.key ||
    event.code.toLowerCase() === `key${combo.key}`

  if (!keyMatches) return false

  // Check modifiers
  const hasCtrl = event.ctrlKey || event.metaKey // Treat cmd as ctrl on Mac
  const hasAlt = event.altKey
  const hasShift = event.shiftKey
  const hasMeta = event.metaKey

  const wantsCtrl = combo.modifiers.has("ctrl") || combo.modifiers.has("meta")
  const wantsAlt = combo.modifiers.has("alt")
  const wantsShift = combo.modifiers.has("shift")
  const wantsMeta = combo.modifiers.has("meta")

  return (
    hasCtrl === wantsCtrl &&
    hasAlt === wantsAlt &&
    hasShift === wantsShift &&
    (hasMeta === wantsMeta || (wantsCtrl && hasMeta))
  )
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    (activeElement as HTMLElement).isContentEditable
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Register a single keyboard shortcut
 */
export function useKeyboardShortcut(
  keyCombo: KeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: {
    enabled?: boolean
    preventDefault?: boolean
    ignoreWhenInputFocused?: boolean
  } = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    ignoreWhenInputFocused = true,
  } = options

  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const combo = parseKeyCombo(keyCombo)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (ignoreWhenInputFocused && isInputFocused()) return
      if (!matchesKeyCombo(event, combo)) return

      if (preventDefault) {
        event.preventDefault()
      }
      handlerRef.current(event)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [keyCombo, enabled, preventDefault, ignoreWhenInputFocused])
}

/**
 * Register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: ShortcutOptions = {}
): void {
  const { enabled = true } = options

  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const parsedShortcuts = shortcutsRef.current.map((config) => ({
      ...config,
      parsed: parseKeyCombo(config.key),
    }))

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of parsedShortcuts) {
        if (shortcut.ignoreWhenInputFocused !== false && isInputFocused()) {
          continue
        }

        if (matchesKeyCombo(event, shortcut.parsed)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled])
}

/**
 * Hook for escape key to close modals/dialogs
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
  useKeyboardShortcut("escape", handler, {
    enabled,
    ignoreWhenInputFocused: false,
  })
}

/**
 * Hook for search shortcut (Ctrl/Cmd + K)
 */
export function useSearchShortcut(
  handler: () => void,
  enabled: boolean = true
): void {
  useKeyboardShortcut("ctrl+k", handler, { enabled })
}

// ============================================================================
// COMMON SHORTCUTS REGISTRY
// ============================================================================

export interface RegisteredShortcut {
  key: KeyCombo
  description: string
  scope?: string
}

const shortcutRegistry: RegisteredShortcut[] = []

/**
 * Register a shortcut for the help menu
 */
export function registerShortcut(shortcut: RegisteredShortcut): void {
  const existing = shortcutRegistry.findIndex((s) => s.key === shortcut.key)
  if (existing !== -1) {
    shortcutRegistry[existing] = shortcut
  } else {
    shortcutRegistry.push(shortcut)
  }
}

/**
 * Get all registered shortcuts
 */
export function getRegisteredShortcuts(scope?: string): RegisteredShortcut[] {
  if (scope) {
    return shortcutRegistry.filter((s) => !s.scope || s.scope === scope)
  }
  return [...shortcutRegistry]
}

// ============================================================================
// DEFAULT SHORTCUTS
// ============================================================================

// Register common shortcuts
registerShortcut({ key: "ctrl+k", description: "Open search" })
registerShortcut({ key: "escape", description: "Close dialog/modal" })
registerShortcut({ key: "shift+?", description: "Show keyboard shortcuts" })
registerShortcut({ key: "ctrl+/", description: "Toggle sidebar" })
registerShortcut({ key: "ctrl+n", description: "Create new item", scope: "workspace" })
registerShortcut({ key: "ctrl+s", description: "Save changes", scope: "editor" })

