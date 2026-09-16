"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LockIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  createPublicClient,
  erc20Abi,
  isAddress,
  parseEther,
} from "viem"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Identicon } from "@/components/wallet/identicon"
import { PasswordField } from "@/components/wallet/password-field"
import {
  createRpcTransport,
  getSupportedChain,
  SELECT_CHAIN_ITEMS,
  USDC_ADDRESSES,
} from "@/lib/wallet/chains"
import { copyText, formatEth, formatToken, shortenAddress } from "@/lib/wallet/format"
import { useWallet } from "@/lib/wallet/wallet-context"

type View = "home" | "send" | "receive" | "settings" | "seed"

export function WalletChrome() {
  const {
    selectedAccount,
    accounts,
    selectedIndex,
    selectAccount,
    addAccount,
    chainId,
    chainName,
    isTestnet,
    switchChain,
    lock,
    connections,
  } = useWallet()
  const [view, setView] = useState<View>("home")

  if (!selectedAccount) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <Select
          items={SELECT_CHAIN_ITEMS}
          value={String(chainId)}
          onValueChange={(value) => {
            if (value) switchChain(Number(value))
          }}
        >
          <SelectTrigger size="sm" className="max-w-[168px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            <SelectGroup>
              {SELECT_CHAIN_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="max-w-[148px]" />}
            >
              <Identicon address={selectedAccount.address} size={16} />
              <span className="truncate">{selectedAccount.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Accounts</DropdownMenuLabel>
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.address}
                    onClick={() => selectAccount(account.index)}
                  >
                    <Identicon address={account.address} size={16} />
                    <span className="min-w-0 flex-1 truncate">{account.name}</span>
                    {account.index === selectedIndex ? <CheckIcon /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={addAccount}>
                  <PlusIcon />
                  Add account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={lock}>
                  <LockIcon />
                  Lock
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            onClick={() => setView("settings")}
          >
            <SettingsIcon />
          </Button>
        </div>
      </header>

      {view === "home" ? (
        <Home onSend={() => setView("send")} onReceive={() => setView("receive")} />
      ) : null}
      {view === "send" ? <SendView onBack={() => setView("home")} /> : null}
      {view === "receive" ? <ReceiveView onBack={() => setView("home")} /> : null}
      {view === "settings" ? (
        <SettingsView onBack={() => setView("home")} onReveal={() => setView("seed")} />
      ) : null}
      {view === "seed" ? <SeedView onBack={() => setView("settings")} /> : null}

      {view === "home" && connections.length > 0 ? (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Connected to {connections[0].name}
          {connections.length > 1 ? ` +${connections.length - 1}` : ""}
        </div>
      ) : null}
      {isTestnet && view === "home" ? (
        <div className="px-4 pb-3">
          <Badge variant="secondary">{chainName}</Badge>
        </div>
      ) : null}
    </div>
  )
}

function Home({ onSend, onReceive }: { onSend: () => void; onReceive: () => void }) {
  const { selectedAccount, chainId, nativeSymbol, activity, chainName } = useWallet()
  const [tab, setTab] = useState("tokens")
  const { eth, usdc, loading, error } = useBalances()

  if (!selectedAccount) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col items-center gap-3 px-5 py-6">
        <Identicon address={selectedAccount.address} size={56} />
        <div className="flex flex-col items-center gap-1">
          <p className="font-heading text-lg font-medium">{selectedAccount.name}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await copyText(selectedAccount.address)
              toast.success("Address copied")
            }}
          >
            {shortenAddress(selectedAccount.address, 5)}
            <CopyIcon data-icon="inline-end" />
          </Button>
        </div>
        <div className="text-center">
          {loading ? (
            <Skeleton className="mx-auto h-9 w-36" />
          ) : eth == null ? (
            <p className="font-heading text-3xl font-medium tracking-tight">— {nativeSymbol}</p>
          ) : (
            <p className="font-heading text-3xl font-medium tracking-tight">
              {formatEth(eth, 5)} {nativeSymbol}
            </p>
          )}
          {error ? (
            <p className="mt-2 text-xs text-muted-foreground">Could not reach {chainName} RPC</p>
          ) : null}
        </div>
        <div className="flex w-full gap-2">
          <Button className="flex-1" onClick={onSend}>
            <ArrowUpRightIcon data-icon="inline-start" />
            Send
          </Button>
          <Button className="flex-1" variant="outline" onClick={onReceive}>
            <ArrowDownLeftIcon data-icon="inline-start" />
            Receive
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("ember:open-browser"))}
          >
            <GlobeIcon data-icon="inline-start" />
            Browser
          </Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 px-4 pb-4">
        <TabsList className="w-full">
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens" className="flex flex-col gap-2 pt-3">
          <TokenRow symbol={nativeSymbol} name="Native balance" amount={eth} loading={loading} />
          {USDC_ADDRESSES[chainId] ? (
            <TokenRow symbol="USDC" name="USD Coin" amount={usdc} loading={loading} decimals={6} />
          ) : null}
        </TabsContent>
        <TabsContent value="activity" className="pt-3">
          {activity.filter((item) => item.chainId === chainId).length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GlobeIcon />
                </EmptyMedia>
                <EmptyTitle>No activity yet</EmptyTitle>
                <EmptyDescription>
                  Sends and dApp transactions from this browser will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-1">
              {activity
                .filter((item) => item.chainId === chainId)
                .map((item) => (
                  <a
                    key={item.hash}
                    href={`${getSupportedChain(chainId)?.chain.blockExplorers?.default.url}/tx/${item.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <ArrowUpRightIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.to ? shortenAddress(item.to) : "Contract call"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={item.status === "reverted" ? "destructive" : "secondary"}>
                        {item.status}
                      </Badge>
                      <ExternalLinkIcon className="text-muted-foreground" />
                    </div>
                  </a>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TokenRow({
  symbol,
  name,
  amount,
  loading,
  decimals = 18,
}: {
  symbol: string
  name: string
  amount: bigint | null
  loading: boolean
  decimals?: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted font-medium">
        {symbol.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{symbol}</p>
        <p className="text-xs text-muted-foreground">{name}</p>
      </div>
      {loading ? (
        <Skeleton className="h-4 w-16" />
      ) : amount == null ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <p className="text-sm font-medium">
          {decimals === 18 ? formatEth(amount, 4) : formatToken(amount, decimals)}
        </p>
      )}
    </div>
  )
}

function useBalances() {
  const { selectedAccount, chainId, customRpcs, getBalance } = useWallet()
  const [eth, setEth] = useState<bigint | null>(null)
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!selectedAccount) return
      setLoading(true)
      setError(false)
      try {
        const native = await getBalance()
        if (!cancelled) setEth(native)
        const token = USDC_ADDRESSES[chainId]
        if (token) {
          const chain = getSupportedChain(chainId)?.chain
          if (!chain) return
          const client = createPublicClient({
            chain,
            transport: createRpcTransport(chainId, customRpcs),
          })
          const value = await client.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [selectedAccount.address],
          })
          if (!cancelled) setUsdc(value)
        } else if (!cancelled) {
          setUsdc(null)
        }
      } catch {
        if (!cancelled) {
          setEth(null)
          setUsdc(null)
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 15_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [selectedAccount, chainId, customRpcs, getBalance])

  return { eth, usdc, loading, error }
}

function SendView({ onBack }: { onBack: () => void }) {
  const { nativeSymbol, sendNative, estimateSend, isTestnet, chainName } = useWallet()
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [fee, setFee] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const valid = isAddress(to) && Number(amount) > 0

  useEffect(() => {
    if (!valid) {
      setFee(null)
      return
    }
    let cancelled = false
    estimateSend({ to: to as `0x${string}`, amount })
      .then((result) => {
        if (!cancelled) setFee(formatEth(result.fee, 6))
      })
      .catch(() => {
        if (!cancelled) setFee(null)
      })
    return () => {
      cancelled = true
    }
  }, [amount, estimateSend, to, valid])

  async function submit() {
    if (!valid) return
    setBusy(true)
    setError("")
    try {
      parseEther(amount)
      const hash = await sendNative({ to: to as `0x${string}`, amount })
      toast.success(`Sent ${amount} ${nativeSymbol}`, { description: shortenAddress(hash, 6) })
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <h1 className="font-heading text-base font-medium">Send {nativeSymbol}</h1>
      </div>
      {!isTestnet ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Main network</AlertTitle>
          <AlertDescription>
            You are on {chainName}. This transaction spends real funds.
          </AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={to.length > 0 && !isAddress(to) ? true : undefined}>
          <FieldLabel htmlFor="send-to">Recipient</FieldLabel>
          <Input
            id="send-to"
            placeholder="0x…"
            value={to}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={to.length > 0 && !isAddress(to)}
            onChange={(event) => setTo(event.target.value.trim())}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="send-amount">Amount</FieldLabel>
          <Input
            id="send-amount"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          {fee ? (
            <FieldDescription>
              Estimated fee {fee} {nativeSymbol}
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-auto" disabled={!valid || busy} onClick={() => void submit()}>
        {busy ? <Spinner data-icon="inline-start" /> : null}
        {busy ? "Sending…" : `Send ${nativeSymbol}`}
      </Button>
    </div>
  )
}

function ReceiveView({ onBack }: { onBack: () => void }) {
  const { selectedAccount, chainName } = useWallet()
  if (!selectedAccount) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 p-5">
      <div className="flex w-full items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <h1 className="font-heading text-base font-medium">Receive</h1>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Only send {chainName} assets to this address.
      </p>
      <div className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
        <QRCodeSVG value={selectedAccount.address} size={180} />
      </div>
      <p className="max-w-full break-all text-center font-mono text-xs">{selectedAccount.address}</p>
      <Button
        variant="outline"
        onClick={async () => {
          await copyText(selectedAccount.address)
          toast.success("Address copied")
        }}
      >
        <CopyIcon data-icon="inline-start" />
        Copy address
      </Button>
    </div>
  )
}

function SettingsView({
  onBack,
  onReveal,
}: {
  onBack: () => void
  onReveal: () => void
}) {
  const { connections, disconnectOrigin, resetWallet, lock } = useWallet()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <h1 className="font-heading text-base font-medium">Settings</h1>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Security</p>
        <Button variant="outline" className="justify-start" onClick={onReveal}>
          Reveal secret phrase
        </Button>
        <Button variant="outline" className="justify-start" onClick={lock}>
          <LockIcon data-icon="inline-start" />
          Lock wallet
        </Button>
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Connected dApps</p>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sites connected.</p>
        ) : (
          connections.map((site) => (
            <div key={site.origin} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <GlobeIcon />
              <span className="min-w-0 flex-1 truncate text-sm">{site.name}</span>
              <Button size="sm" variant="ghost" onClick={() => disconnectOrigin(site.origin)}>
                Disconnect
              </Button>
            </div>
          ))
        )}
      </div>
      <Separator />
      <Button
        variant="destructive"
        className="justify-start"
        onClick={() => {
          resetWallet()
          toast.message("Wallet removed from this browser.")
        }}
      >
        <Trash2Icon data-icon="inline-start" />
        Remove wallet from this browser
      </Button>
    </div>
  )
}

function SeedView({ onBack }: { onBack: () => void }) {
  const { revealMnemonic } = useWallet()
  const [password, setPassword] = useState("")
  const [phrase, setPhrase] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const words = useMemo(() => (phrase ? phrase.split(" ") : []), [phrase])

  async function reveal() {
    setBusy(true)
    setError("")
    try {
      setPhrase(await revealMnemonic(password))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decrypt.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <h1 className="font-heading text-base font-medium">Secret phrase</h1>
      </div>
      {phrase ? (
        <>
          <Alert variant="destructive">
            <AlertTitle>Never share these words</AlertTitle>
            <AlertDescription>
              Anyone with this phrase can empty the wallet. Hide this screen before you screenshot.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-3 gap-2">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className="rounded-lg bg-muted px-2 py-2 font-mono text-sm">
                {index + 1}. {word}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <PasswordField
            id="reveal-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
            error={error}
          />
          <Button disabled={busy || !password} onClick={() => void reveal()}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            Reveal phrase
          </Button>
        </>
      )}
    </div>
  )
}
