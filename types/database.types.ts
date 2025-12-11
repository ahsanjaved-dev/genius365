// types/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ============================================
// ENUMS
// ============================================
export type PlanTier = "starter" | "professional" | "enterprise" | "custom"
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid"
export type UserRole = "super_admin" | "org_owner" | "org_admin" | "org_member" | "org_viewer"
export type DepartmentRole = "owner" | "admin" | "member" | "viewer"
export type UserStatus = "active" | "inactive" | "suspended" | "pending_invitation"

export type AgentProvider = "vapi" | "retell" | "synthflow"
export type VoiceProvider = "elevenlabs" | "deepgram" | "azure" | "openai" | "cartesia"
export type ModelProvider = "openai" | "anthropic" | "google" | "groq"
export type TranscriberProvider = "deepgram" | "assemblyai" | "openai"

export type IntegrationType =
  | "make"
  | "ghl"
  | "twilio"
  | "slack"
  | "zapier"
  | "calendar"
  | "crm"
  | "webhook"
export type IntegrationStatus = "active" | "inactive" | "error" | "pending_setup"

export type CallDirection = "inbound" | "outbound"
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "no-answer"
  | "busy"
  | "canceled"

export type ResourceType =
  | "voice_minutes"
  | "api_calls"
  | "storage_gb"
  | "tts_characters"
  | "llm_tokens"
  | "stt_minutes"
  | "phone_number_rental"
  | "sms_messages"

export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible" | "overdue"

// ============================================
// INTERFACES
// ============================================
export interface ResourceLimits {
  max_departments?: number
  max_users_per_department?: number
  max_agents_per_department?: number
  max_minutes_per_month?: number
  max_integrations?: number
  storage_gb?: number
}

export interface OrganizationFeatures {
  departments_enabled?: boolean
  api_access?: boolean
  white_label?: boolean
  sso?: boolean
  advanced_analytics?: boolean
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
// DATABASE SCHEMA
// ============================================
export interface Database {
  public: {
    Tables: {
      super_admins: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          permissions: string[]
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          permissions?: string[]
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          permissions?: string[]
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan_tier: PlanTier
          subscription_status: SubscriptionStatus
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          custom_domain: string | null
          branding_config: Json
          resource_limits: Json
          features: Json
          settings: Json
          onboarding_completed: boolean
          onboarding_step: number
          current_month_minutes: number
          current_month_cost: number
          last_usage_reset_at: string
          created_by: string | null
          invited_at: string | null
          activated_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan_tier?: PlanTier
          subscription_status?: SubscriptionStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          custom_domain?: string | null
          branding_config?: Json
          resource_limits?: Json
          features?: Json
          settings?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          current_month_minutes?: number
          current_month_cost?: number
          last_usage_reset_at?: string
          created_by?: string | null
          invited_at?: string | null
          activated_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan_tier?: PlanTier
          subscription_status?: SubscriptionStatus
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          custom_domain?: string | null
          branding_config?: Json
          resource_limits?: Json
          features?: Json
          settings?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          current_month_minutes?: number
          current_month_cost?: number
          last_usage_reset_at?: string
          created_by?: string | null
          invited_at?: string | null
          activated_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }

      departments: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          slug: string
          settings: Json
          resource_limits: Json
          total_agents: number
          total_users: number
          current_month_minutes: number
          current_month_cost: number
          created_by: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          slug: string
          settings?: Json
          resource_limits?: Json
          total_agents?: number
          total_users?: number
          current_month_minutes?: number
          current_month_cost?: number
          created_by?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          slug?: string
          settings?: Json
          resource_limits?: Json
          total_agents?: number
          total_users?: number
          current_month_minutes?: number
          current_month_cost?: number
          created_by?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      users: {
        Row: {
          id: string
          organization_id: string
          email: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          phone_number: string | null
          role: UserRole
          status: UserStatus
          settings: Json
          invited_by: string | null
          invited_at: string | null
          invitation_accepted_at: string | null
          last_login_at: string | null
          last_activity_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          role?: UserRole
          status?: UserStatus
          settings?: Json
          invited_by?: string | null
          invited_at?: string | null
          invitation_accepted_at?: string | null
          last_login_at?: string | null
          last_activity_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          role?: UserRole
          status?: UserStatus
          settings?: Json
          invited_by?: string | null
          invited_at?: string | null
          invitation_accepted_at?: string | null
          last_login_at?: string | null
          last_activity_at?: string | null
          deleted_at?: string | null
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
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      department_permissions: {
        Row: {
          id: string
          user_id: string
          department_id: string
          role: DepartmentRole
          permissions: string[]
          granted_by: string | null
          granted_at: string
          expires_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          department_id: string
          role?: DepartmentRole
          permissions?: string[]
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          department_id?: string
          role?: DepartmentRole
          permissions?: string[]
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_permissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      ai_agents: {
        Row: {
          id: string
          organization_id: string
          department_id: string
          name: string
          description: string | null
          provider: AgentProvider
          voice_provider: VoiceProvider | null
          model_provider: ModelProvider | null
          transcriber_provider: TranscriberProvider | null
          config: Json
          is_active: boolean
          version: number
          external_agent_id: string | null
          external_phone_number: string | null
          tags: string[]
          total_conversations: number
          total_minutes: number
          total_cost: number
          last_conversation_at: string | null
          created_by: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          department_id: string
          name: string
          description?: string | null
          provider: AgentProvider
          voice_provider?: VoiceProvider | null
          model_provider?: ModelProvider | null
          transcriber_provider?: TranscriberProvider | null
          config?: Json
          is_active?: boolean
          version?: number
          external_agent_id?: string | null
          external_phone_number?: string | null
          tags?: string[]
          total_conversations?: number
          total_minutes?: number
          total_cost?: number
          last_conversation_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          department_id?: string
          name?: string
          description?: string | null
          provider?: AgentProvider
          voice_provider?: VoiceProvider | null
          model_provider?: ModelProvider | null
          transcriber_provider?: TranscriberProvider | null
          config?: Json
          is_active?: boolean
          version?: number
          external_agent_id?: string | null
          external_phone_number?: string | null
          tags?: string[]
          total_conversations?: number
          total_minutes?: number
          total_cost?: number
          last_conversation_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
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
            foreignKeyName: "ai_agents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      conversations: {
        Row: {
          id: string
          organization_id: string
          department_id: string
          agent_id: string | null
          external_id: string | null
          phone_number: string | null
          caller_name: string | null
          direction: CallDirection
          status: CallStatus
          duration_seconds: number
          started_at: string | null
          ended_at: string | null
          recording_url: string | null
          transcript: string | null
          transcript_search: unknown | null
          summary: string | null
          sentiment: string | null
          quality_score: number | null
          customer_rating: number | null
          requires_follow_up: boolean
          follow_up_notes: string | null
          followed_up_at: string | null
          followed_up_by: string | null
          cost_breakdown: Json
          total_cost: number
          error_message: string | null
          error_code: string | null
          metadata: Json
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          department_id: string
          agent_id?: string | null
          external_id?: string | null
          phone_number?: string | null
          caller_name?: string | null
          direction: CallDirection
          status?: CallStatus
          duration_seconds?: number
          started_at?: string | null
          ended_at?: string | null
          recording_url?: string | null
          transcript?: string | null
          transcript_search?: unknown | null
          summary?: string | null
          sentiment?: string | null
          quality_score?: number | null
          customer_rating?: number | null
          requires_follow_up?: boolean
          follow_up_notes?: string | null
          followed_up_at?: string | null
          followed_up_by?: string | null
          cost_breakdown?: Json
          total_cost?: number
          error_message?: string | null
          error_code?: string | null
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          department_id?: string
          agent_id?: string | null
          external_id?: string | null
          phone_number?: string | null
          caller_name?: string | null
          direction?: CallDirection
          status?: CallStatus
          duration_seconds?: number
          started_at?: string | null
          ended_at?: string | null
          recording_url?: string | null
          transcript?: string | null
          transcript_search?: unknown | null
          summary?: string | null
          sentiment?: string | null
          quality_score?: number | null
          customer_rating?: number | null
          requires_follow_up?: boolean
          follow_up_notes?: string | null
          followed_up_at?: string | null
          followed_up_by?: string | null
          cost_breakdown?: Json
          total_cost?: number
          error_message?: string | null
          error_code?: string | null
          metadata?: Json
          deleted_at?: string | null
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
            foreignKeyName: "conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          department_id: string | null
          conversation_id: string | null
          resource_type: ResourceType
          resource_provider: string | null
          quantity: number
          unit: string | null
          unit_cost: number | null
          total_cost: number | null
          billing_period: string | null
          is_billable: boolean
          invoice_id: string | null
          metadata: Json
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          department_id?: string | null
          conversation_id?: string | null
          resource_type: ResourceType
          resource_provider?: string | null
          quantity: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          billing_period?: string | null
          is_billable?: boolean
          invoice_id?: string | null
          metadata?: Json
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          department_id?: string | null
          conversation_id?: string | null
          resource_type?: ResourceType
          resource_provider?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          billing_period?: string | null
          is_billable?: boolean
          invoice_id?: string | null
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
            foreignKeyName: "usage_tracking_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
// EXPORTED TYPES
// ============================================
export type SuperAdmin = Database["public"]["Tables"]["super_admins"]["Row"]
export type SuperAdminInsert = Database["public"]["Tables"]["super_admins"]["Insert"]
export type SuperAdminUpdate = Database["public"]["Tables"]["super_admins"]["Update"]

export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"]
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"]

export type Department = Database["public"]["Tables"]["departments"]["Row"]
export type DepartmentInsert = Database["public"]["Tables"]["departments"]["Insert"]
export type DepartmentUpdate = Database["public"]["Tables"]["departments"]["Update"]

export type User = Database["public"]["Tables"]["users"]["Row"]
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"]
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

export type DepartmentPermission = Database["public"]["Tables"]["department_permissions"]["Row"]
export type DepartmentPermissionInsert =
  Database["public"]["Tables"]["department_permissions"]["Insert"]
export type DepartmentPermissionUpdate =
  Database["public"]["Tables"]["department_permissions"]["Update"]

export type AIAgent = Database["public"]["Tables"]["ai_agents"]["Row"]
export type AIAgentInsert = Database["public"]["Tables"]["ai_agents"]["Insert"]
export type AIAgentUpdate = Database["public"]["Tables"]["ai_agents"]["Update"]

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"]
export type ConversationUpdate = Database["public"]["Tables"]["conversations"]["Update"]

export type UsageTracking = Database["public"]["Tables"]["usage_tracking"]["Row"]
export type UsageTrackingInsert = Database["public"]["Tables"]["usage_tracking"]["Insert"]
export type UsageTrackingUpdate = Database["public"]["Tables"]["usage_tracking"]["Update"]

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

// ============================================
// EXTENDED TYPES (With Relations)
// ============================================
export interface OrganizationWithStats extends Organization {
  total_departments?: number
  total_users?: number
  total_agents?: number
  total_conversations?: number
}

export interface DepartmentWithStats extends Department {
  organization?: Organization
}

export interface UserWithOrganization extends User {
  organization: Organization
}

export interface UserWithDepartments extends User {
  departments: (DepartmentPermission & { department: Department })[]
}

export interface DashboardStats {
  total_agents: number
  total_conversations: number
  total_minutes: number
  total_cost: number
  conversations_this_month: number
  minutes_this_month: number
  cost_this_month: number
}
