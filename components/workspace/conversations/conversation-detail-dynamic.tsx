"use client"

/**
 * Dynamic Conversation Detail Modal Wrapper
 * Phase 4.1.2: Implement dynamic imports for heavy components
 *
 * Lazy loads the conversation detail modal to reduce initial bundle size.
 */

import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { ModalLoader } from "@/components/shared/loading-spinner"
import type { ConversationWithAgent } from "@/types/database.types"

// Dynamically import the modal content
const ConversationDetailModal = dynamic(
  () =>
    import("./conversation-detail-modal").then((mod) => ({
      default: mod.ConversationDetailModal,
    })),
  {
    loading: () => <ModalLoader text="Loading conversation details..." />,
    ssr: false,
  }
)

// Wrapper that handles the dialog
interface ConversationDetailDialogProps {
  conversation: ConversationWithAgent | null
  open: boolean
  onClose: () => void
}

export function ConversationDetailDialog({
  conversation,
  open,
  onClose,
}: ConversationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        {open && conversation && (
          <ConversationDetailModal
            conversation={conversation}
            open={open}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Re-export for convenience
export { ConversationDetailModal }

