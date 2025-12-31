-- ============================================================================
-- DROP LEADS TABLE AND RELATED OBJECTS
-- Migration: drop_leads_table
-- Date: 2025-01-01
-- Description: Removes the leads module entirely in favor of campaigns module
-- ============================================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can insert leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Admins can delete leads in their workspaces" ON leads;

-- Drop indexes
DROP INDEX IF EXISTS idx_leads_workspace_id;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_agent_id;
DROP INDEX IF EXISTS idx_leads_conversation_id;
DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_leads_deleted_at;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
DROP FUNCTION IF EXISTS update_leads_updated_at();

-- Drop the leads table
DROP TABLE IF EXISTS leads CASCADE;

-- Drop lead-related enums (only used by leads table)
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS lead_source;

