export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ============================================
// ENUMS - Type-safe string literals
// ============================================

export type PlanTier = "starter" | "professional" | "enterprise"
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid"
export type UserRole = "owner" | "admin" | "member"

// AI Provider Types
export type AgentProvider = "vapi" | "retell" | "synthflow"
export type VoiceProvider = "elevenlabs" | "deepgram" | "azure" | "openai" | "cartesia"
export type ModelProvider = "openai" | "anthropic" | "google" | "groq"
export type TranscriberProvider = "deepgram" | "assemblyai" | "openai"

// Integration Types
export type IntegrationType = "make" | "ghl" | "twilio" | "slack" | "zapier" | "calendar" | "crm"
export type IntegrationStatus = "active" | "inactive" | "error"

// Conversation Types
export type CallDirection = "inbound" | "outbound"
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "no-answer"

// Usage Types
export type ResourceType =
  | "voice_minutes"
  | "api_calls"
  | "storage_gb"
  | "tts_chars"
  | "llm_tokens"
  | "stt_minutes"

// Billing Types
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible"

// ============================================
// CONFIG INTERFACES
// ============================================

export interface ResourceLimits {
  max_agents: number
  max_minutes_per_month: number
  max_integrations: number
  storage_gb: number
}

export interface BrandingConfig {
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  company_name?: string
}

export interface AgentConfig {
  system_prompt?: string
  first_message?: string
  voice_id?: string
  voice_settings?: {
    stability?: number
    similarity_boost?: number
    speed?: number
  }
  model_settings?: {
    model?: string
    temperature?: number
    max_tokens?: number
  }
  transcriber_settings?: {
    language?: string
    model?: string
  }
  end_call_phrases?: string[]
  max_duration_seconds?: number
  [key: string]: unknown
}

export interface CostBreakdown {
  voice_cost?: number
  llm_cost?: number
  transcription_cost?: number
  telephony_cost?: number
  total?: number
}

// ============================================
// DATABASE SCHEMA TYPES
// ============================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan_tier: string
          custom_domain: string | null
          branding_config: Json
          resource_limits: Json
          subscription_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan_tier?: string
          custom_domain?: string | null
          branding_config?: Json
          resource_limits?: Json
          subscription_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan_tier?: string
          custom_domain?: string | null
          branding_config?: Json
          resource_limits?: Json
          subscription_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      users: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: string
          settings: Json
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          role?: string
          settings?: Json
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: string
          settings?: Json
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }

      ai_agents: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          provider: string
          voice_provider: string | null
          model_provider: string | null
          transcriber_provider: string | null
          config: Json
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          provider: string
          voice_provider?: string | null
          model_provider?: string | null
          transcriber_provider?: string | null
          config?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          provider?: string
          voice_provider?: string | null
          model_provider?: string | null
          transcriber_provider?: string | null
          config?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      integrations: {
        Row: {
          id: string
          organization_id: string
          integration_type: string
          name: string
          credentials_encrypted: string | null
          config: Json
          status: string
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          integration_type: string
          name: string
          credentials_encrypted?: string | null
          config?: Json
          status?: string
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          integration_type?: string
          name?: string
          credentials_encrypted?: string | null
          config?: Json
          status?: string
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }

      conversations: {
        Row: {
          id: string
          organization_id: string
          agent_id: string | null
          external_id: string | null
          phone_number: string | null
          caller_name: string | null
          direction: string
          status: string
          duration_seconds: number
          recording_url: string | null
          transcript: string | null
          summary: string | null
          sentiment: string | null
          cost_breakdown: Json
          total_cost: number
          metadata: Json
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id?: string | null
          external_id?: string | null
          phone_number?: string | null
          caller_name?: string | null
          direction?: string
          status?: string
          duration_seconds?: number
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
          cost_breakdown?: Json
          total_cost?: number
          metadata?: Json
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          agent_id?: string | null
          external_id?: string | null
          phone_number?: string | null
          caller_name?: string | null
          direction?: string
          status?: string
          duration_seconds?: number
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
          cost_breakdown?: Json
          total_cost?: number
          metadata?: Json
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }

      usage_tracking: {
        Row: {
          id: string
          organization_id: string
          conversation_id: string | null
          resource_type: string
          resource_provider: string | null
          quantity: number
          unit: string | null
          unit_cost: number | null
          total_cost: number | null
          metadata: Json
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          conversation_id?: string | null
          resource_type: string
          resource_provider?: string | null
          quantity: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          metadata?: Json
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          conversation_id?: string | null
          resource_type?: string
          resource_provider?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          metadata?: Json
          recorded_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_tracking_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }

      billing_invoices: {
        Row: {
          id: string
          organization_id: string
          stripe_invoice_id: string | null
          invoice_number: string | null
          amount_due: number
          amount_paid: number
          currency: string
          status: string
          period_start: string
          period_end: string
          due_date: string | null
          invoice_pdf_url: string | null
          hosted_invoice_url: string | null
          line_items: Json
          metadata: Json
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_invoice_id?: string | null
          invoice_number?: string | null
          amount_due: number
          amount_paid?: number
          currency?: string
          status?: string
          period_start: string
          period_end: string
          due_date?: string | null
          invoice_pdf_url?: string | null
          hosted_invoice_url?: string | null
          line_items?: Json
          metadata?: Json
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_invoice_id?: string | null
          invoice_number?: string | null
          amount_due?: number
          amount_paid?: number
          currency?: string
          status?: string
          period_start?: string
          period_end?: string
          due_date?: string | null
          invoice_pdf_url?: string | null
          hosted_invoice_url?: string | null
          line_items?: Json
          metadata?: Json
          created_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================
// HELPER TYPES - For easier usage in components
// ============================================

export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"]
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"]

export type User = Database["public"]["Tables"]["users"]["Row"]
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"]
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

export type AIAgent = Database["public"]["Tables"]["ai_agents"]["Row"]
export type AIAgentInsert = Database["public"]["Tables"]["ai_agents"]["Insert"]
export type AIAgentUpdate = Database["public"]["Tables"]["ai_agents"]["Update"]

export type Integration = Database["public"]["Tables"]["integrations"]["Row"]
export type IntegrationInsert = Database["public"]["Tables"]["integrations"]["Insert"]
export type IntegrationUpdate = Database["public"]["Tables"]["integrations"]["Update"]

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"]
export type ConversationUpdate = Database["public"]["Tables"]["conversations"]["Update"]

export type UsageRecord = Database["public"]["Tables"]["usage_tracking"]["Row"]
export type UsageRecordInsert = Database["public"]["Tables"]["usage_tracking"]["Insert"]
export type UsageRecordUpdate = Database["public"]["Tables"]["usage_tracking"]["Update"]

export type BillingInvoice = Database["public"]["Tables"]["billing_invoices"]["Row"]
export type BillingInvoiceInsert = Database["public"]["Tables"]["billing_invoices"]["Insert"]
export type BillingInvoiceUpdate = Database["public"]["Tables"]["billing_invoices"]["Update"]

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// User with organization data
export interface UserWithOrganization extends User {
  organization: Organization
}

// Agent with stats
export interface AgentWithStats extends AIAgent {
  total_conversations?: number
  total_minutes?: number
  total_cost?: number
}

// Dashboard stats
export interface DashboardStats {
  total_agents: number
  total_conversations: number
  total_minutes: number
  total_cost: number
  conversations_this_month: number
  minutes_this_month: number
  cost_this_month: number
}
