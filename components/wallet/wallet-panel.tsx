"use client"

import { WalletChrome } from "@/components/wallet/wallet-chrome"
import { Onboarding } from "@/components/wallet/onboarding"
import { Unlock } from "@/components/wallet/unlock"
import { ApprovalDialog } from "@/components/wallet/approval-dialog"
import { EmberMark } from "@/components/wallet/ember-mark"
import { Skeleton } from "@/components/ui/skeleton"
import { useWallet } from "@/lib/wallet/wallet-context"

export function WalletPanel() {
  const { status } = useWallet()

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {status === "booting" ? (
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <EmberMark />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mx-auto size-14 rounded-full" />
          <Skeleton className="mx-auto h-8 w-40" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : null}
      {status === "welcome" ? <Onboarding /> : null}
      {status === "locked" ? <Unlock /> : null}
      {status === "unlocked" ? <WalletChrome /> : null}
      <ApprovalDialog />
    </div>
  )
}
