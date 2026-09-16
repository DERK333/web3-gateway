"use client"

import { useEffect, useRef, useState } from "react"
import { CompassIcon, FlameIcon, PanelRightIcon, WalletIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DappBrowser } from "@/components/dapp/dapp-browser"
import { WalletPanel } from "@/components/wallet/wallet-panel"
import { cn } from "@/lib/utils"

type Pane = "wallet" | "browser"

export function AppShell() {
  const [pane, setPane] = useState<Pane>("wallet")
  const [walletHidden, setWalletHidden] = useState(false)
  const urlBarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onOpenBrowser() {
      setPane("browser")
      setWalletHidden(false)
    }
    window.addEventListener("ember:open-browser", onOpenBrowser)
    return () => window.removeEventListener("ember:open-browser", onOpenBrowser)
  }, [])

  return (
    <div className="h-dvh overflow-hidden bg-muted/40">
      <div
        className={cn(
          "mx-auto flex h-full w-full max-w-6xl flex-col gap-3 p-3",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]",
          "landscape:max-w-none landscape:flex-row landscape:items-stretch",
          "lg:max-w-[90rem] lg:flex-row lg:gap-6 lg:p-6"
        )}
      >
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10",
            pane !== "browser" && "max-lg:portrait:hidden"
          )}
        >
          <div className="hidden shrink-0 items-center justify-end gap-1 border-b px-2 py-1 max-lg:landscape:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWalletHidden((current) => !current)}
            >
              <PanelRightIcon data-icon="inline-start" />
              {walletHidden ? "Show wallet" : "Hide wallet"}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <DappBrowser urlBarRef={urlBarRef} />
          </div>
        </section>

        <aside
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-[400px] flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10",
            "landscape:mx-0 landscape:w-[min(360px,42vw)] landscape:max-w-none landscape:flex-none",
            "lg:w-[400px] lg:max-w-none",
            pane !== "wallet" && "max-lg:portrait:hidden",
            walletHidden && "max-lg:landscape:hidden"
          )}
        >
          <WalletPanel />
        </aside>

        {walletHidden ? (
          <Button
            size="icon-lg"
            className="fixed right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] hidden rounded-full shadow-md max-lg:landscape:inline-flex"
            aria-label="Show Ember wallet"
            onClick={() => setWalletHidden(false)}
          >
            <FlameIcon />
          </Button>
        ) : null}

        <nav className="grid shrink-0 grid-cols-2 gap-2 landscape:hidden lg:hidden">
          <Button
            variant={pane === "wallet" ? "default" : "outline"}
            onClick={() => setPane("wallet")}
          >
            <WalletIcon data-icon="inline-start" />
            Wallet
          </Button>
          <Button
            variant={pane === "browser" ? "default" : "outline"}
            onClick={() => setPane("browser")}
          >
            <CompassIcon data-icon="inline-start" />
            Browser
          </Button>
        </nav>
      </div>
    </div>
  )
}
