/**
 * Email Client - SMTP via Nodemailer (Mailgun)
 * 
 * This module configures the SMTP transport for sending emails.
 * Supports Mailgun SMTP or any other SMTP provider.
 */

import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { env } from "@/lib/env"

// Create the SMTP transporter
let transporter: Transporter | null = null

/**
 * Get or create the SMTP transporter
 */
export function getEmailTransporter(): Transporter | null {
  // Return cached transporter if already created
  if (transporter) {
    return transporter
  }

  // Check if SMTP is configured
  if (!env.smtpUser || !env.smtpPass) {
    console.warn("[Email] SMTP credentials not configured. Email sending will be disabled.")
    console.warn("[Email] Set SMTP_USER and SMTP_PASS environment variables.")
    return null
  }

  try {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure, // true for 465, false for other ports
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      // Connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000, // 30 seconds for sending
    })

    console.log(`[Email] SMTP transporter configured: ${env.smtpHost}:${env.smtpPort}`)
    return transporter
  } catch (error) {
    console.error("[Email] Failed to create SMTP transporter:", error)
    return null
  }
}

/**
 * Verify SMTP connection
 * Call this on app startup to ensure email is working
 */
export async function verifyEmailConnection(): Promise<boolean> {
  const transport = getEmailTransporter()
  if (!transport) {
    return false
  }

  try {
    await transport.verify()
    console.log("[Email] SMTP connection verified successfully")
    return true
  } catch (error) {
    console.error("[Email] SMTP connection verification failed:", error)
    return false
  }
}

/**
 * Get the formatted "from" address
 */
export function getFromAddress(): string {
  if (env.fromName) {
    return `"${env.fromName}" <${env.fromEmail}>`
  }
  return env.fromEmail
}

// Export for backwards compatibility
export const FROM_EMAIL = env.fromEmail
