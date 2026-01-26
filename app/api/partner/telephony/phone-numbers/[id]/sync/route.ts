import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPartnerAuthContext } from "@/lib/api/auth"
import { logger } from "@/lib/logger"
import { createByoPhoneNumber, deletePhoneNumber, attachPhoneNumberToAssistant } from "@/lib/integrations/vapi/phone-numbers"
import { 
  importByoSipPhoneNumber, 
  updateRetellPhoneNumber, 
  deleteRetellPhoneNumber,
  attachRetellPhoneNumberToAgent,
  detachRetellPhoneNumberFromAgent 
} from "@/lib/integrations/retell/phone-numbers"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/partner/telephony/phone-numbers/[id]/sync
 * Sync a phone number to VAPI or Retell (depending on provider query param)
 * 
 * Query params:
 * - provider: "vapi" (default) or "retell"
 * - terminationUri: Required for Retell BYO SIP import
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const targetProvider = url.searchParams.get("provider") || "vapi"
    const terminationUri = url.searchParams.get("terminationUri")
    
    const authContext = await getPartnerAuthContext()
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { partner, partnerRole } = authContext
    const partnerId = partner.id

    // Only partner admins/owners can sync phone numbers
    if (!partnerRole || !["owner", "admin"].includes(partnerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the phone number with SIP trunk
    if (!prisma!) {
      return NextResponse.json(
        { error: "Database connection unavailable" },
        { status: 500 }
      )
    }

    const phoneNumber = await prisma!!.phoneNumber.findFirst({
      where: {
        id,
        partnerId,
        deletedAt: null,
      },
      include: {
        sipTrunk: true,
      },
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    // Check if already synced
    if (phoneNumber.externalId) {
      return NextResponse.json(
        { error: `Phone number is already synced to ${phoneNumber.provider}`, externalId: phoneNumber.externalId },
        { status: 400 }
      )
    }

    // ============================================================================
    // SYNC TO VAPI
    // ============================================================================
    if (targetProvider === "vapi") {
      // Check if SIP trunk is synced for VAPI
      if (!phoneNumber.sipTrunk?.externalCredentialId) {
        return NextResponse.json(
          { error: "Phone number's SIP trunk must be synced to VAPI first" },
          { status: 400 }
        )
      }

      // Get VAPI integration for this partner
      const vapiIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "vapi",
          isActive: true,
        },
      })

      if (!vapiIntegration) {
        return NextResponse.json(
          { error: "No active VAPI integration found. Please configure VAPI API keys first." },
          { status: 400 }
        )
      }

      const apiKeys = vapiIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "VAPI API key not configured" },
          { status: 400 }
        )
      }

      // Create BYO phone number in VAPI
      const createResult = await createByoPhoneNumber({
        apiKey: apiKeys.default_secret_key,
        number: phoneNumber.phoneNumberE164 || phoneNumber.phoneNumber,
        credentialId: phoneNumber.sipTrunk.externalCredentialId,
        name: phoneNumber.friendlyName || phoneNumber.phoneNumber,
        numberE164CheckEnabled: false, // Allow non-E164 numbers
      })

      if (!createResult.success || !createResult.data) {
        logger.error(`Failed to create VAPI BYO phone number: ${createResult.error}`)
        
        // Update with error status
        await prisma!.phoneNumber.update({
          where: { id },
          data: {
            status: "error",
            config: {
              ...(phoneNumber.config as object || {}),
              syncError: createResult.error,
            },
          },
        })

        return NextResponse.json(
          { error: `Failed to sync to VAPI: ${createResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number with VAPI ID
      const updatedPhoneNumber = await prisma!.phoneNumber.update({
        where: { id },
        data: {
          externalId: createResult.data.id,
          sipUri: createResult.data.sipUri,
          provider: "vapi",
          config: {
            ...(phoneNumber.config as object || {}),
            vapiPhoneNumberId: createResult.data.id,
            vapiStatus: createResult.data.status,
            syncedAt: new Date().toISOString(),
            syncError: null,
          },
        },
      })

      logger.info(`Phone number ${id} synced to VAPI: ${createResult.data.id}`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          provider: "vapi",
          externalId: createResult.data.id,
          sipUri: createResult.data.sipUri,
          status: "created",
          phoneNumber: updatedPhoneNumber,
        },
      })
    }

    // ============================================================================
    // SYNC TO RETELL
    // ============================================================================
    if (targetProvider === "retell") {
      // Get Retell integration for this partner
      const retellIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "retell",
          isActive: true,
        },
      })

      if (!retellIntegration) {
        return NextResponse.json(
          { error: "No active Retell integration found. Please configure Retell API keys first." },
          { status: 400 }
        )
      }

      const apiKeys = retellIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "Retell API key not configured" },
          { status: 400 }
        )
      }

      // Determine termination URI for BYO SIP
      // Retell expects just host:port format (e.g., "52.65.130.216:5060")
      // NOT the full SIP URI with phone number
      let sipTerminationUri = terminationUri
      
      if (!sipTerminationUri && phoneNumber.sipTrunk) {
        // Construct termination URI from SIP trunk: just host:port
        sipTerminationUri = `${phoneNumber.sipTrunk.sipServer}:${phoneNumber.sipTrunk.sipPort || 5060}`
      }

      if (!sipTerminationUri) {
        return NextResponse.json(
          { error: "Termination URI is required for Retell BYO SIP import. Configure a SIP trunk or provide terminationUri query param." },
          { status: 400 }
        )
      }
      
      // Clean the termination URI - remove any sip: prefix or phone number
      // Retell only wants host:port
      sipTerminationUri = sipTerminationUri
        .replace(/^sip:/i, '')
        .replace(/^[^@]+@/, '') // Remove anything before @
        .trim()

      // Import phone number to Retell as BYO SIP
      const importResult = await importByoSipPhoneNumber({
        apiKey: apiKeys.default_secret_key,
        phoneNumber: phoneNumber.phoneNumberE164 || phoneNumber.phoneNumber,
        terminationUri: sipTerminationUri,
        nickname: phoneNumber.friendlyName || phoneNumber.phoneNumber,
      })

      if (!importResult.success || !importResult.data) {
        logger.error(`Failed to import phone number to Retell: ${importResult.error}`)
        
        // Update with error status
        await prisma!.phoneNumber.update({
          where: { id },
          data: {
            status: "error",
            config: {
              ...(phoneNumber.config as object || {}),
              syncError: importResult.error,
            },
          },
        })

        return NextResponse.json(
          { error: `Failed to sync to Retell: ${importResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number with Retell data
      // Note: Retell uses the phone number itself as the identifier
      const updatedPhoneNumber = await prisma!.phoneNumber.update({
        where: { id },
        data: {
          externalId: importResult.data.phone_number, // Retell uses phone number as ID
          sipUri: importResult.data.termination_uri,
          provider: "retell",
          config: {
            ...(phoneNumber.config as object || {}),
            retellPhoneNumber: importResult.data.phone_number,
            retellTerminationUri: importResult.data.termination_uri,
            syncedAt: new Date().toISOString(),
            syncError: null,
          },
        },
      })

      logger.info(`Phone number ${id} synced to Retell: ${importResult.data.phone_number}`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          provider: "retell",
          externalId: importResult.data.phone_number,
          terminationUri: importResult.data.termination_uri,
          status: "created",
          phoneNumber: updatedPhoneNumber,
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid provider. Use 'vapi' or 'retell'" },
      { status: 400 }
    )
  } catch (error) {
    logger.error("Error syncing phone number:", error as Record<string, unknown>)
    return NextResponse.json(
      { error: "Failed to sync phone number" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/partner/telephony/phone-numbers/[id]/sync
 * Remove phone number from VAPI or Retell (based on current provider)
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const authContext = await getPartnerAuthContext()
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { partner, partnerRole } = authContext
    const partnerId = partner.id

    // Only partner admins/owners can unsync phone numbers
    if (!partnerRole || !["owner", "admin"].includes(partnerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the phone number
    const phoneNumber = await prisma!.phoneNumber.findFirst({
      where: {
        id,
        partnerId,
        deletedAt: null,
      },
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    if (!phoneNumber.externalId) {
      return NextResponse.json(
        { error: "Phone number is not synced to any provider" },
        { status: 400 }
      )
    }

    const currentProvider = phoneNumber.provider

    // ============================================================================
    // UNSYNC FROM VAPI
    // ============================================================================
    if (currentProvider === "vapi") {
      // Get VAPI integration for this partner
      const vapiIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "vapi",
          isActive: true,
        },
      })

      if (!vapiIntegration) {
        return NextResponse.json(
          { error: "No active VAPI integration found" },
          { status: 400 }
        )
      }

      const apiKeys = vapiIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "VAPI API key not configured" },
          { status: 400 }
        )
      }

      // Delete phone number from VAPI
      const deleteResult = await deletePhoneNumber({
        apiKey: apiKeys.default_secret_key,
        phoneNumberId: phoneNumber.externalId,
      })

      if (!deleteResult.success) {
        logger.error(`Failed to delete VAPI phone number: ${deleteResult.error}`)
        return NextResponse.json(
          { error: `Failed to unsync from VAPI: ${deleteResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number to remove VAPI reference
      await prisma!.phoneNumber.update({
        where: { id },
        data: {
          externalId: null,
          sipUri: null,
          provider: "sip",
          config: {
            ...(phoneNumber.config as object || {}),
            vapiPhoneNumberId: null,
            vapiStatus: null,
            syncedAt: null,
            unsyncedAt: new Date().toISOString(),
          },
        },
      })

      logger.info(`Phone number ${id} unsynced from VAPI`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          previousProvider: "vapi",
          status: "unsynced",
        },
      })
    }

    // ============================================================================
    // UNSYNC FROM RETELL
    // ============================================================================
    if (currentProvider === "retell") {
      // Get Retell integration for this partner
      const retellIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "retell",
          isActive: true,
        },
      })

      if (!retellIntegration) {
        return NextResponse.json(
          { error: "No active Retell integration found" },
          { status: 400 }
        )
      }

      const apiKeys = retellIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "Retell API key not configured" },
          { status: 400 }
        )
      }

      // Delete phone number from Retell
      const deleteResult = await deleteRetellPhoneNumber({
        apiKey: apiKeys.default_secret_key,
        phoneNumber: phoneNumber.externalId, // Retell uses phone number as ID
      })

      if (!deleteResult.success) {
        logger.error(`Failed to delete Retell phone number: ${deleteResult.error}`)
        return NextResponse.json(
          { error: `Failed to unsync from Retell: ${deleteResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number to remove Retell reference
      await prisma!.phoneNumber.update({
        where: { id },
        data: {
          externalId: null,
          sipUri: null,
          provider: "sip",
          config: {
            ...(phoneNumber.config as object || {}),
            retellPhoneNumber: null,
            retellTerminationUri: null,
            syncedAt: null,
            unsyncedAt: new Date().toISOString(),
          },
        },
      })

      logger.info(`Phone number ${id} unsynced from Retell`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          previousProvider: "retell",
          status: "unsynced",
        },
      })
    }

    return NextResponse.json(
      { error: `Unknown provider: ${currentProvider}` },
      { status: 400 }
    )
  } catch (error) {
    logger.error("Error unsyncing phone number:", error as Record<string, unknown>)
    return NextResponse.json(
      { error: "Failed to unsync phone number" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/partner/telephony/phone-numbers/[id]/sync
 * Assign phone number to an agent in VAPI or Retell (based on current provider)
 * 
 * Request body:
 * - agentId: string | null - Agent to assign (null to unassign)
 * - direction: "inbound" | "outbound" | "both" - Assignment direction (Retell only, default: "both")
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const authContext = await getPartnerAuthContext()
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { partner, partnerRole } = authContext
    const partnerId = partner.id

    // Only partner admins/owners can assign phone numbers
    if (!partnerRole || !["owner", "admin"].includes(partnerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { agentId, direction = "both" } = body as { 
      agentId: string | null
      direction?: "inbound" | "outbound" | "both"
    }

    // Get the phone number
    const phoneNumber = await prisma!.phoneNumber.findFirst({
      where: {
        id,
        partnerId,
        deletedAt: null,
      },
    })

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    if (!phoneNumber.externalId) {
      return NextResponse.json(
        { error: "Phone number must be synced to a provider first" },
        { status: 400 }
      )
    }

    const currentProvider = phoneNumber.provider

    // ============================================================================
    // ASSIGN TO VAPI AGENT
    // ============================================================================
    if (currentProvider === "vapi") {
      // Get VAPI integration for this partner
      const vapiIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "vapi",
          isActive: true,
        },
      })

      if (!vapiIntegration) {
        return NextResponse.json(
          { error: "No active VAPI integration found" },
          { status: 400 }
        )
      }

      const apiKeys = vapiIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "VAPI API key not configured" },
          { status: 400 }
        )
      }

      // Get the agent's external ID if assigning
      let vapiAssistantId: string | null = null
      if (agentId) {
        const agent = await prisma!.aiAgent.findFirst({
          where: {
            id: agentId,
            deletedAt: null,
          },
        })

        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        if (!agent.externalAgentId) {
          return NextResponse.json(
            { error: "Agent must be synced to VAPI first" },
            { status: 400 }
          )
        }

        if (agent.provider !== "vapi") {
          return NextResponse.json(
            { error: "Cannot assign VAPI phone number to a non-VAPI agent" },
            { status: 400 }
          )
        }

        vapiAssistantId = agent.externalAgentId
      }

      // Attach/detach phone number to/from assistant in VAPI
      const attachResult = await attachPhoneNumberToAssistant({
        apiKey: apiKeys.default_secret_key,
        phoneNumberId: phoneNumber.externalId,
        assistantId: vapiAssistantId,
      })

      if (!attachResult.success) {
        logger.error(`Failed to ${agentId ? 'attach' : 'detach'} VAPI phone number: ${attachResult.error}`)
        return NextResponse.json(
          { error: `Failed to ${agentId ? 'assign' : 'unassign'} phone number: ${attachResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number assignment in database
      const updatedPhoneNumber = await prisma!.phoneNumber.update({
        where: { id },
        data: {
          assignedAgentId: agentId,
          status: agentId ? "assigned" : "available",
          assignedAt: agentId ? new Date() : null,
        },
      })

      // Also update the agent's assigned phone number
      if (agentId) {
        await prisma!.aiAgent.update({
          where: { id: agentId },
          data: {
            assignedPhoneNumberId: id,
            externalPhoneNumber: phoneNumber.phoneNumber,
          },
        })
      } else if (phoneNumber.assignedAgentId) {
        // Clear the previous agent's assignment
        await prisma!.aiAgent.update({
          where: { id: phoneNumber.assignedAgentId },
          data: {
            assignedPhoneNumberId: null,
            externalPhoneNumber: null,
          },
        })
      }

      logger.info(`Phone number ${id} ${agentId ? 'assigned to' : 'unassigned from'} VAPI agent ${agentId || phoneNumber.assignedAgentId}`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          provider: "vapi",
          agentId,
          status: agentId ? "assigned" : "unassigned",
          phoneNumber: updatedPhoneNumber,
        },
      })
    }

    // ============================================================================
    // ASSIGN TO RETELL AGENT
    // ============================================================================
    if (currentProvider === "retell") {
      // Get Retell integration for this partner
      const retellIntegration = await prisma!.partnerIntegration.findFirst({
        where: {
          partnerId,
          provider: "retell",
          isActive: true,
        },
      })

      if (!retellIntegration) {
        return NextResponse.json(
          { error: "No active Retell integration found" },
          { status: 400 }
        )
      }

      const apiKeys = retellIntegration.apiKeys as { default_secret_key?: string }
      if (!apiKeys?.default_secret_key) {
        return NextResponse.json(
          { error: "Retell API key not configured" },
          { status: 400 }
        )
      }

      // Get the agent's external ID if assigning
      let retellAgentId: string | null = null
      if (agentId) {
        const agent = await prisma!.aiAgent.findFirst({
          where: {
            id: agentId,
            deletedAt: null,
          },
        })

        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 })
        }

        if (!agent.externalAgentId) {
          return NextResponse.json(
            { error: "Agent must be synced to Retell first" },
            { status: 400 }
          )
        }

        if (agent.provider !== "retell") {
          return NextResponse.json(
            { error: "Cannot assign Retell phone number to a non-Retell agent" },
            { status: 400 }
          )
        }

        retellAgentId = agent.externalAgentId
      }

      // Attach/detach phone number to/from agent in Retell
      let attachResult
      if (retellAgentId) {
        attachResult = await attachRetellPhoneNumberToAgent({
          apiKey: apiKeys.default_secret_key,
          phoneNumber: phoneNumber.externalId, // Retell uses phone number as ID
          agentId: retellAgentId,
          direction: direction,
        })
      } else {
        attachResult = await detachRetellPhoneNumberFromAgent({
          apiKey: apiKeys.default_secret_key,
          phoneNumber: phoneNumber.externalId,
          direction: direction,
        })
      }

      if (!attachResult.success) {
        logger.error(`Failed to ${agentId ? 'attach' : 'detach'} Retell phone number: ${attachResult.error}`)
        return NextResponse.json(
          { error: `Failed to ${agentId ? 'assign' : 'unassign'} phone number: ${attachResult.error}` },
          { status: 500 }
        )
      }

      // Update phone number assignment in database
      const updatedPhoneNumber = await prisma!.phoneNumber.update({
        where: { id },
        data: {
          assignedAgentId: agentId,
          status: agentId ? "assigned" : "available",
          assignedAt: agentId ? new Date() : null,
          config: {
            ...(phoneNumber.config as object || {}),
            retellInboundAgentId: attachResult.data?.inbound_agent_id,
            retellOutboundAgentId: attachResult.data?.outbound_agent_id,
          },
        },
      })

      // Also update the agent's assigned phone number
      if (agentId) {
        await prisma!.aiAgent.update({
          where: { id: agentId },
          data: {
            assignedPhoneNumberId: id,
            externalPhoneNumber: phoneNumber.phoneNumber,
          },
        })
      } else if (phoneNumber.assignedAgentId) {
        // Clear the previous agent's assignment
        await prisma!.aiAgent.update({
          where: { id: phoneNumber.assignedAgentId },
          data: {
            assignedPhoneNumberId: null,
            externalPhoneNumber: null,
          },
        })
      }

      logger.info(`Phone number ${id} ${agentId ? 'assigned to' : 'unassigned from'} Retell agent ${agentId || phoneNumber.assignedAgentId} (${direction})`)

      return NextResponse.json({
        data: {
          phoneNumberId: id,
          provider: "retell",
          agentId,
          direction,
          status: agentId ? "assigned" : "unassigned",
          phoneNumber: updatedPhoneNumber,
        },
      })
    }

    return NextResponse.json(
      { error: `Unknown provider: ${currentProvider}` },
      { status: 400 }
    )
  } catch (error) {
    logger.error("Error assigning phone number:", error as Record<string, unknown>)
    return NextResponse.json(
      { error: "Failed to assign phone number" },
      { status: 500 }
    )
  }
}

