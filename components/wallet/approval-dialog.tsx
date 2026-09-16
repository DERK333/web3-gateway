"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWallet } from "@/lib/wallet/wallet-context"

function originHost(origin: string) {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

export function ApprovalDialog() {
  const { pendingApproval, approvePending, rejectPending, selectedAccount, chainName } =
    useWallet()

  return (
    <Dialog
      open={Boolean(pendingApproval)}
      onOpenChange={(open) => {
        if (!open) rejectPending()
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pendingApproval?.title ?? "Approve request"}</DialogTitle>
          <DialogDescription>
            {pendingApproval ? originHost(pendingApproval.origin) : "A dApp"} is asking Ember to
            act with {selectedAccount ? selectedAccount.name : "your account"} on {chainName}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64 rounded-lg bg-muted px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {pendingApproval?.summary || "No details"}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={rejectPending}>
            Reject
          </Button>
          <Button onClick={approvePending}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
