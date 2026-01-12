/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This module suppresses known "false positive" errors from the Vapi/Daily SDK.
 * 
 * When a call ends normally (e.g., agent's end_call function is triggered),
 * the Daily.co SDK throws "Meeting ended due to ejection: Meeting has ended"
 * which is not actually an error - it's the expected behavior.
 * 
 * This module sets up global error handlers to suppress these specific errors
 * from appearing in the console or Next.js error overlay.
 */

// Check if a message/error indicates a normal call end (not a real error)
function isNormalCallEndMessage(input: any): boolean {
  if (!input) return false
  
  let message = ""
  if (typeof input === "string") {
    message = input
  } else if (input?.message) {
    message = input.message
  } else if (input?.reason) {
    message = input.reason
  } else {
    try {
      message = String(input)
    } catch {
      return false
    }
  }
  
  const lowerMessage = message.toLowerCase()
  return (
    lowerMessage.includes("meeting has ended") ||
    lowerMessage.includes("ejection") ||
    lowerMessage.includes("call has ended") ||
    lowerMessage.includes("meeting ended") ||
    lowerMessage.includes("ended due to ejection")
  )
}

// Setup error suppression immediately when this module is imported
if (typeof window !== "undefined") {
  // Store original console.error
  const originalConsoleError = console.error
  
  // Override console.error to filter SDK errors
  console.error = (...args: any[]) => {
    const shouldSuppress = args.some(arg => isNormalCallEndMessage(arg))
    if (shouldSuppress) {
      // Suppress this error - it's a normal call termination
      return
    }
    originalConsoleError.apply(console, args)
  }
  
  // Window error event handler (capture phase to run before Next.js)
  window.addEventListener("error", (event: ErrorEvent): void => {
    if (isNormalCallEndMessage(event.message) || isNormalCallEndMessage(event.error)) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      return
    }
  }, true)
  
  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent): void => {
    if (isNormalCallEndMessage(event.reason)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
  }, true)
}

// Export a dummy function so the module can be imported
export function initSdkErrorSuppression() {
  // This function does nothing - the suppression is set up as a side effect
  // when this module is imported
}

