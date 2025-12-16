import { z } from "zod"

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const agentSecretApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  key: z.string().min(1),
  provider: z.string().optional(),
  is_active: z.boolean().default(true),
})

export const agentPublicApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  key: z.string().min(1),
  provider: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type AgentSecretApiKey = z.infer<typeof agentSecretApiKeySchema>
export type AgentPublicApiKey = z.infer<typeof agentPublicApiKeySchema>

export type AgentProvider = "vapi" | "retell" | "synthflow"

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  department_id: z.string().uuid(),
  provider: z.enum(["vapi", "retell", "synthflow"] as const),
  voice_provider: z
    .enum(["elevenlabs", "deepgram", "azure", "openai", "cartesia"] as const)
    .optional(),
  model_provider: z.enum(["openai", "anthropic", "google", "groq"] as const).optional(),
  transcriber_provider: z.enum(["deepgram", "assemblyai", "openai"] as const).optional(),
  config: z
    .object({
      system_prompt: z.string().optional(),
      first_message: z.string().optional(),
      voice_id: z.string().optional(),
      voice_settings: z
        .object({
          stability: z.number().min(0).max(1).optional(),
          similarity_boost: z.number().min(0).max(1).optional(),
          speed: z.number().min(0.5).max(2).optional(),
        })
        .optional(),
      model_settings: z
        .object({
          model: z.string().optional(),
          temperature: z.number().min(0).max(2).optional(),
          max_tokens: z.number().min(1).max(4096).optional(),
        })
        .optional(),
      max_duration_seconds: z.number().min(60).max(3600).optional(),
    })
    .optional(),
  agent_secret_api_key: z.array(agentSecretApiKeySchema).optional().default([]),
  agent_public_api_key: z.array(agentPublicApiKeySchema).optional().default([]),
  is_active: z.boolean().optional().default(true),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

export const updateAgentSchema = createAgentSchema.partial()
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  branding_config: z
    .object({
      logo_url: z.string().url().optional(),
      favicon_url: z.string().url().optional(),
      primary_color: z.string().optional(),
      secondary_color: z.string().optional(),
      company_name: z.string().optional(),
    })
    .optional(),
})

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

export const createIntegrationSchema = z.object({
  integration_type: z.enum([
    "make",
    "ghl",
    "twilio",
    "slack",
    "zapier",
    "calendar",
    "crm",
  ] as const),
  name: z.string().min(1).max(255),
  credentials: z.record(z.string(), z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  resource_limits: z
    .object({
      max_agents: z.number().min(1).max(100).optional(),
      max_users: z.number().min(1).max(100).optional(),
      max_minutes_per_month: z.number().min(0).optional(),
    })
    .optional(),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

export const updateDepartmentSchema = createDepartmentSchema.partial()
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export type PlanTier = "free" | "starter" | "pro" | "enterprise"

export interface User {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string
  status: "active" | "invited" | "disabled"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationBranding {
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  company_name?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan_tier: PlanTier
  status: "active" | "pending_activation" | "suspended" | "cancelled"
  subscription_status: "trialing" | "active" | "past_due" | "cancelled" | null
  branding_config: OrganizationBranding | null
  branding: OrganizationBranding | null
  resource_limits: {
    max_departments?: number
    max_agents?: number
    max_users?: number
    max_minutes_per_month?: number
  } | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed fields
  current_month_minutes?: number
  current_month_cost?: number
}

export interface OrganizationWithStats extends Organization {
  total_users?: number
  total_agents?: number
  total_conversations?: number
  total_minutes?: number
}

export interface Department {
  id: string
  organization_id: string
  name: string
  description: string | null
  slug: string
  resource_limits: {
    max_agents?: number
    max_users?: number
    max_minutes_per_month?: number
  } | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed fields
  total_agents?: number
  total_users?: number
  current_month_minutes?: number
  current_month_cost?: number
}

export interface DepartmentPermission {
  department_id: string
  user_id: string
  role: "owner" | "admin" | "member" | "viewer"
  created_at: string
}

export interface DepartmentMember {
  id: string
  user_id: string
  user: User
  role: "owner" | "admin" | "member" | "viewer"
  created_at: string
}

// ============================================================================
// AGENT TYPES
// ============================================================================

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
    model?: string
    language?: string
  }
  end_call_phrases?: string[]
  max_duration_seconds?: number
  retell_llm_id?: string
}

export interface AIAgent {
  id: string
  name: string
  description: string | null
  provider: AgentProvider
  voice_provider: string | null
  model_provider: string | null
  transcriber_provider: string | null
  config: AgentConfig
  is_active: boolean
  organization_id: string
  department_id: string
  created_by: string
  external_agent_id: string | null
  agent_secret_api_key: AgentSecretApiKey[]
  agent_public_api_key: AgentPublicApiKey[]
  created_at: string
  updated_at: string
  // Computed fields (optional, from joins/aggregations)
  total_conversations?: number
  total_minutes?: number
  total_cost?: number
}

export interface VapiAgentConfig {
  name: string
  voice?: {
    provider: string
    voiceId: string
    stability?: number
    similarityBoost?: number
  }
  model?: {
    provider: string
    model: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  }
  transcriber?: {
    provider: string
    model?: string
    language?: string
  }
  firstMessage?: string
  endCallPhrases?: string[]
  maxDurationSeconds?: number
}

export interface RetellAgentConfig {
  agent_name: string
  voice_id: string
  llm_websocket_url?: string
  webhook_url?: string
}

export interface SynthflowAgentConfig {
  name: string
  voice_id: string
  model_id: string
  instructions: string
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Conversation {
  id: string
  organization_id: string
  department_id: string
  agent_id: string
  external_call_id: string | null
  direction: "inbound" | "outbound"
  status: "queued" | "in_progress" | "completed" | "failed" | "no_answer"
  phone_number: string | null
  caller_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number
  recording_url: string | null
  transcript: string | null
  summary: string | null
  sentiment: "positive" | "neutral" | "negative" | null
  quality_score: number | null
  customer_rating: number | null
  total_cost: number | null
  cost_breakdown: Record<string, number> | null
  requires_follow_up: boolean
  follow_up_notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ConversationWithAgent extends Conversation {
  agent?: AIAgent
}

export interface ConversationWithDetails extends Conversation {
  agent?: AIAgent
  department?: Department
}

// ============================================================================
// DASHBOARD & ADMIN TYPES
// ============================================================================

export interface DashboardStats {
  total_agents: number
  total_conversations: number
  total_minutes: number
  total_cost: number
  conversations_this_month: number
  minutes_this_month: number
  cost_this_month: number  // <-- ADD THIS LINE
  active_agents?: number
  conversations_today?: number
  average_duration?: number
  success_rate?: number
}

export interface SuperAdmin {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
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