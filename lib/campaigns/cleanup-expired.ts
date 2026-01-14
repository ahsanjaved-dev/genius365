/**
 * Cleanup Expired Campaigns
 * 
 * This module handles automatic cancellation of campaigns that have expired
 * without being started. Should be run via a cron job or scheduled function.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/logger"

export interface CleanupResult {
  success: boolean
  cancelledCount: number
  errors: string[]
}

/**
 * Cancel campaigns that have passed their expiry date
 * 
 * @returns CleanupResult with count of cancelled campaigns
 */
export async function cleanupExpiredCampaigns(): Promise<CleanupResult> {
  const adminClient = createAdminClient()
  const errors: string[] = []
  let cancelledCount = 0

  try {
    const now = new Date().toISOString()

    // Find campaigns that are:
    // 1. Status is 'draft' (not yet started)
    // 2. Have an expiry date set
    // 3. Expiry date is in the past
    const { data: expiredCampaigns, error: fetchError } = await adminClient
      .from("call_campaigns")
      .select("id, name, workspace_id, scheduled_expires_at")
      .eq("status", "draft")
      .not("scheduled_expires_at", "is", null)
      .lt("scheduled_expires_at", now)
      .is("deleted_at", null)

    if (fetchError) {
      logger.error("[CleanupExpired] Error fetching expired campaigns:", {
        message: fetchError.message,
        code: fetchError.code,
      })
      errors.push(`Failed to fetch expired campaigns: ${fetchError.message}`)
      return { success: false, cancelledCount: 0, errors }
    }

    if (!expiredCampaigns || expiredCampaigns.length === 0) {
      logger.info("[CleanupExpired] No expired campaigns found")
      return { success: true, cancelledCount: 0, errors: [] }
    }

    logger.info(`[CleanupExpired] Found ${expiredCampaigns.length} expired campaigns`)

    // Cancel each expired campaign
    for (const campaign of expiredCampaigns) {
      try {
        const { error: updateError } = await adminClient
          .from("call_campaigns")
          .update({
            status: "cancelled",
            updated_at: now,
          })
          .eq("id", campaign.id)

        if (updateError) {
          logger.error(
            `[CleanupExpired] Failed to cancel campaign ${campaign.id}:`,
            {
              message: updateError.message,
              code: updateError.code,
            }
          )
          errors.push(`Campaign ${campaign.name} (${campaign.id}): ${updateError.message}`)
        } else {
          cancelledCount++
          logger.info(
            `[CleanupExpired] Cancelled campaign: ${campaign.name} (${campaign.id})`
          )
        }
      } catch (err) {
        const error = err as Error
        logger.error(`[CleanupExpired] Exception cancelling campaign ${campaign.id}:`, {
          message: error.message,
          name: error.name,
        })
        errors.push(`Campaign ${campaign.name} (${campaign.id}): ${error.message}`)
      }
    }

    const success = errors.length === 0
    logger.info(
      `[CleanupExpired] Cleanup complete. Cancelled: ${cancelledCount}, Errors: ${errors.length}`
    )

    return { success, cancelledCount, errors }
  } catch (err) {
    const error = err as Error
    logger.error("[CleanupExpired] Unexpected error during cleanup:", {
      message: error.message,
      name: error.name,
    })
    errors.push(`Unexpected error: ${error.message}`)
    return { success: false, cancelledCount, errors }
  }
}

/**
 * Cleanup old incomplete drafts (older than 24 hours)
 * 
 * This removes campaign drafts that:
 * 1. Have status "draft"
 * 2. Have name "Untitled Campaign" (never renamed by user)
 * 3. Are older than 24 hours
 * 4. Have no recipients (abandoned before import)
 * 
 * @returns CleanupResult with count of deleted drafts
 */
export async function cleanupOldIncompleteDrafts(): Promise<CleanupResult> {
  const adminClient = createAdminClient()
  const errors: string[] = []
  let deletedCount = 0

  try {
    // Calculate 24 hours ago
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Find old incomplete drafts
    const { data: oldDrafts, error: fetchError } = await adminClient
      .from("call_campaigns")
      .select("id, name, workspace_id, created_at, total_recipients, wizard_completed")
      .eq("status", "draft")
      .eq("name", "Untitled Campaign")
      .eq("total_recipients", 0)
      .lt("created_at", cutoffTime)
      .is("deleted_at", null)

    if (fetchError) {
      logger.error("[CleanupDrafts] Error fetching old drafts:", {
        message: fetchError.message,
        code: fetchError.code,
      })
      errors.push(`Failed to fetch old drafts: ${fetchError.message}`)
      return { success: false, cancelledCount: 0, errors }
    }

    if (!oldDrafts || oldDrafts.length === 0) {
      logger.info("[CleanupDrafts] No old incomplete drafts found")
      return { success: true, cancelledCount: 0, errors: [] }
    }

    logger.info(`[CleanupDrafts] Found ${oldDrafts.length} old incomplete drafts to delete`)

    // Delete each old draft (cascade will delete recipients too)
    for (const draft of oldDrafts) {
      try {
        const { error: deleteError } = await adminClient
          .from("call_campaigns")
          .delete()
          .eq("id", draft.id)

        if (deleteError) {
          logger.error(`[CleanupDrafts] Failed to delete draft ${draft.id}:`, {
            message: deleteError.message,
            code: deleteError.code,
          })
          errors.push(`Draft ${draft.id}: ${deleteError.message}`)
        } else {
          deletedCount++
          logger.info(`[CleanupDrafts] Deleted old draft: ${draft.id} (workspace: ${draft.workspace_id})`)
        }
      } catch (err) {
        const error = err as Error
        logger.error(`[CleanupDrafts] Exception deleting draft ${draft.id}:`, {
          message: error.message,
          name: error.name,
        })
        errors.push(`Draft ${draft.id}: ${error.message}`)
      }
    }

    const success = errors.length === 0
    logger.info(`[CleanupDrafts] Cleanup complete. Deleted: ${deletedCount}, Errors: ${errors.length}`)

    return { success, cancelledCount: deletedCount, errors }
  } catch (err) {
    const error = err as Error
    logger.error("[CleanupDrafts] Unexpected error during cleanup:", {
      message: error.message,
      name: error.name,
    })
    errors.push(`Unexpected error: ${error.message}`)
    return { success: false, cancelledCount: deletedCount, errors }
  }
}

/**
 * Get campaigns that will expire soon (within the next 24 hours)
 * Useful for sending notification emails
 * 
 * @returns Array of campaigns expiring soon
 */
export async function getCampaignsExpiringSoon() {
  const adminClient = createAdminClient()

  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const { data: campaigns, error } = await adminClient
      .from("call_campaigns")
      .select(`
        id,
        name,
        workspace_id,
        scheduled_start_at,
        scheduled_expires_at,
        created_by,
        workspace:workspaces!inner(id, name, partner_id)
      `)
      .eq("status", "draft")
      .not("scheduled_expires_at", "is", null)
      .gte("scheduled_expires_at", now.toISOString())
      .lte("scheduled_expires_at", in24Hours)
      .is("deleted_at", null)

    if (error) {
      logger.error("[CleanupExpired] Error fetching campaigns expiring soon:", {
        message: error.message,
        code: error.code,
      })
      return []
    }

    return campaigns || []
  } catch (err) {
    logger.error("[CleanupExpired] Exception getting campaigns expiring soon:", {
      message: err instanceof Error ? err.message : String(err),
      error: String(err),
    })
    return []
  }
}

