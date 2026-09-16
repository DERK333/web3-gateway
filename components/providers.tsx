"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { WalletProvider } from "@/lib/wallet/wallet-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <WalletProvider>
          {children}
          <Toaster />
        </WalletProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
