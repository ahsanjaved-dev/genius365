import { resend, FROM_EMAIL } from "./client"
import { WorkspaceInvitationEmail } from "./templates/workspace-invitation"

// ============================================================================
// WORKSPACE INVITATION EMAIL (with Partner Branding)
// ============================================================================

interface SendWorkspaceInvitationParams {
  to: string
  workspaceName: string
  inviterName?: string
  inviteLink: string
  role: string
  message?: string
  expiresAt: string
  partnerBranding?: {
    companyName?: string
    logoUrl?: string
    primaryColor?: string
  }
}

export async function sendWorkspaceInvitationEmail(params: SendWorkspaceInvitationParams) {
  const companyName = params.partnerBranding?.companyName || "Inspralv"

  if (!resend) {
    console.log("[Email] Resend not configured. Would send workspace invitation to:", params.to)
    console.log("[Email] Invite link:", params.inviteLink)
    return { success: true, simulated: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${companyName} <${FROM_EMAIL}>`,
      to: params.to,
      subject: `You're invited to join ${params.workspaceName} on ${companyName}`,
      react: WorkspaceInvitationEmail({
        workspaceName: params.workspaceName,
        inviterName: params.inviterName,
        inviteLink: params.inviteLink,
        role: params.role,
        message: params.message,
        expiresAt: params.expiresAt,
        partnerName: companyName,
        logoUrl: params.partnerBranding?.logoUrl,
        primaryColor: params.partnerBranding?.primaryColor,
      }),
    })

    if (error) {
      console.error("[Email] Failed to send workspace invitation:", error)
      throw error
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[Email] Error sending workspace invitation:", error)
    throw error
  }
}
