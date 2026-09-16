"use client"

import { HearthSwap } from "@/components/dapp/hearth-swap"
import { WalletPanel } from "@/components/wallet/wallet-panel"

export function AppShell() {
  return (
    <div className="min-h-svh bg-muted/40">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-6 lg:p-6">
        <section className="min-h-[70vh] flex-1 overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10 lg:min-h-[calc(100svh-3rem)]">
          <HearthSwap />
        </section>
        <aside className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 lg:h-[calc(100svh-3rem)]">
          <WalletPanel />
        </aside>
      </div>
    </div>
  )
}
