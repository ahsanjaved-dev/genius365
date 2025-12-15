import { resend, FROM_EMAIL } from "./client"
import { InvitationEmail } from "./templates/invitation"

interface SendInvitationEmailParams {
  to: string
  organizationName: string
  inviterName?: string
  inviteLink: string
  role: string
  message?: string
  expiresAt: string
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  if (!resend) {
    console.log("[Email] Resend not configured. Would send invitation to:", params.to)
    console.log("[Email] Invite link:", params.inviteLink)
    return { success: true, simulated: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Inspralv <${FROM_EMAIL}>`,
      to: params.to,
      subject: `You're invited to join ${params.organizationName} on Inspralv`,
      react: InvitationEmail({
        organizationName: params.organizationName,
        inviterName: params.inviterName,
        inviteLink: params.inviteLink,
        role: params.role,
        message: params.message,
        expiresAt: params.expiresAt,
      }),
    })

    if (error) {
      console.error("[Email] Failed to send invitation:", error)
      throw error
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error("[Email] Error sending invitation:", error)
    throw error
  }
}
