"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeftRightIcon,
  CheckCircle2Icon,
  PlugZapIcon,
  ShieldIcon,
  SignatureIcon,
} from "lucide-react"
import { hexToNumber } from "viem"
import { sepolia } from "viem/chains"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { emberProvider } from "@/lib/wallet/provider"
import { shortenAddress } from "@/lib/wallet/format"
import { useWallet } from "@/lib/wallet/wallet-context"

type DappState = {
  address?: `0x${string}`
  chainId?: number
  lastSignature?: string
  siwe?: string
}

function getProvider() {
  if (typeof window === "undefined") return emberProvider
  return window.ethereum ?? emberProvider
}

export function HearthSwap() {
  const { status } = useWallet()
  const [state, setState] = useState<DappState>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    const provider = getProvider()
    try {
      const [accounts, chainId] = (await Promise.all([
        provider.request({ method: "eth_accounts" }),
        provider.request({ method: "eth_chainId" }),
      ])) as [string[], string]
      setState((current) => ({
        ...current,
        address: accounts[0] as `0x${string}` | undefined,
        chainId: hexToNumber(chainId as `0x${string}`),
      }))
    } catch {
      setState({})
    }
  }, [])

  useEffect(() => {
    const provider = getProvider()
    const onAccounts = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? accounts : []
      setState((current) => ({
        ...current,
        address: list[0] as `0x${string}` | undefined,
      }))
    }
    const onChain = (id: unknown) => {
      setState((current) => ({
        ...current,
        chainId: typeof id === "string" ? hexToNumber(id as `0x${string}`) : undefined,
      }))
    }
    provider.on?.("accountsChanged", onAccounts)
    provider.on?.("chainChanged", onChain)
    void refresh()
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts)
      provider.removeListener?.("chainChanged", onChain)
    }
  }, [refresh, status])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError("")
    try {
      await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  async function connect() {
    await run("connect", async () => {
      const provider = getProvider()
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[]
      const chainId = (await provider.request({ method: "eth_chainId" })) as string
      setState({
        address: accounts[0] as `0x${string}`,
        chainId: hexToNumber(chainId as `0x${string}`),
      })
      toast.success("Hearth Swap connected to Ember")
    })
  }

  async function signIn() {
    if (!state.address) return
    await run("siwe", async () => {
      const provider = getProvider()
      const message = [
        "hearth.swap wants you to sign in with your Ethereum account:",
        state.address,
        "",
        "URI: https://hearth.swap",
        "Version: 1",
        `Chain ID: ${state.chainId ?? 11155111}`,
        `Nonce: ${crypto.randomUUID().slice(0, 8)}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join("\n")
      const signature = (await provider.request({
        method: "personal_sign",
        params: [message, state.address] as never,
      })) as string
      setState((current) => ({ ...current, siwe: signature, lastSignature: signature }))
      toast.success("Signed in with Ethereum")
    })
  }

  async function signOrder() {
    if (!state.address) return
    await run("typed", async () => {
      const provider = getProvider()
      const domain = {
        name: "Hearth Swap",
        version: "1",
        chainId: state.chainId ?? sepolia.id,
        verifyingContract: "0x0000000000000000000000000000000000000001" as const,
      }
      const types = {
        Order: [
          { name: "maker", type: "address" },
          { name: "sellToken", type: "string" },
          { name: "buyToken", type: "string" },
          { name: "sellAmount", type: "string" },
          { name: "nonce", type: "string" },
        ],
      }
      const message = {
        maker: state.address,
        sellToken: "ETH",
        buyToken: "USDC",
        sellAmount: "0.01",
        nonce: crypto.randomUUID(),
      }
      const signature = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [
          state.address,
          JSON.stringify({
            types: { EIP712Domain: [], ...types },
            domain,
            primaryType: "Order",
            message,
          }),
        ] as never,
      })) as string
      setState((current) => ({ ...current, lastSignature: signature }))
      toast.success("Swap order signed")
    })
  }

  async function switchToSepolia() {
    await run("switch", async () => {
      const provider = getProvider()
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      })
      toast.success("Requested Sepolia")
    })
  }

  async function sendSelfCheck() {
    if (!state.address) return
    await run("send", async () => {
      if (!state.address) return
      const provider = getProvider()
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: state.address,
            to: state.address,
            value: "0x0",
          },
        ] as never,
      })) as string
      toast.success("Zero-value self transfer submitted", {
        description: shortenAddress(hash, 6),
      })
    })
  }

  const locked = status !== "unlocked"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ArrowLeftRightIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-medium">Hearth Swap</p>
          <p className="text-xs text-muted-foreground">Demo dApp using Ember’s injected provider</p>
        </div>
        {state.address ? (
          <Badge variant="secondary">{shortenAddress(state.address)}</Badge>
        ) : (
          <Badge variant="outline">Not connected</Badge>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {locked ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Unlock Ember first</EmptyTitle>
              <EmptyDescription>
                Create or import a wallet in the panel on the right. Hearth Swap talks to Ember the same way Uniswap talks to MetaMask: `window.ethereum` plus EIP-1193.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Connect wallet</CardTitle>
                <CardDescription>
                  Ember will prompt you to share Account 1. Reject from the wallet if you do not trust this site.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span>Network</span>
                  <span>{state.chainId === 11155111 ? "Sepolia" : state.chainId ?? "—"}</span>
                </div>
                {state.siwe ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2Icon />
                    Signed in with Ethereum
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button disabled={Boolean(busy)} onClick={() => void connect()}>
                  {busy === "connect" ? <Spinner data-icon="inline-start" /> : <PlugZapIcon data-icon="inline-start" />}
                  {state.address ? "Connected" : "Connect Ember"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!state.address || Boolean(busy)}
                  onClick={() => void signIn()}
                >
                  {busy === "siwe" ? <Spinner data-icon="inline-start" /> : <ShieldIcon data-icon="inline-start" />}
                  Sign in
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Swap ETH for USDC</CardTitle>
                <CardDescription>
                  This demo never hits a DEX router. Confirming the order asks Ember to sign EIP-712 typed data, which is what most dApps use before a swap.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-muted px-3 py-3">
                    <p className="text-xs text-muted-foreground">You pay</p>
                    <p className="font-heading text-lg font-medium">0.01 ETH</p>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-3">
                    <p className="text-xs text-muted-foreground">You receive</p>
                    <p className="font-heading text-lg font-medium">24.10 USDC</p>
                  </div>
                </div>
                {state.lastSignature ? (
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {shortenAddress(state.lastSignature, 10)}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button disabled={!state.address || Boolean(busy)} onClick={() => void signOrder()}>
                  {busy === "typed" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SignatureIcon data-icon="inline-start" />
                  )}
                  Sign swap order
                </Button>
                <Button
                  variant="outline"
                  disabled={!state.address || Boolean(busy)}
                  onClick={() => void sendSelfCheck()}
                >
                  {busy === "send" ? <Spinner data-icon="inline-start" /> : null}
                  Send 0 ETH to self
                </Button>
                <Button
                  variant="ghost"
                  disabled={Boolean(busy)}
                  onClick={() => void switchToSepolia()}
                >
                  Switch to Sepolia
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}
