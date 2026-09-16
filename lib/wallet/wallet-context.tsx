"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  createPublicClient,
  createWalletClient,
  hexToBigInt,
  isAddress,
  isHex,
  parseEther,
  type Hex,
  type TransactionReceipt,
} from "viem"
import { encryptSecret, decryptSecret } from "@/lib/wallet/crypto"
import {
  DEFAULT_CHAIN_ID,
  createRpcTransport,
  getSupportedChain,
} from "@/lib/wallet/chains"
import { deriveAccounts, getSigner } from "@/lib/wallet/hd"
import { chainIdHex, messageFromHex, parseChainId } from "@/lib/wallet/format"
import {
  announceProvider,
  emitProviderEvent,
  setRpcHandler,
} from "@/lib/wallet/provider"
import {
  clearWalletStorage,
  hasVault,
  readMeta,
  readVault,
  writeMeta,
  writeVault,
} from "@/lib/wallet/storage"
import {
  ProviderRpcError,
  UNAUTHORIZED,
  UNRECOGNIZED_CHAIN,
  USER_REJECTED,
  type ActivityItem,
  type ApprovalRequest,
  type ConnectedSite,
  type PersistedMeta,
  type VaultPayload,
  type WalletAccount,
} from "@/lib/wallet/types"

type WalletStatus = "booting" | "welcome" | "locked" | "unlocked"

type PendingApproval = ApprovalRequest & {
  resolve: (value: unknown) => void
  reject: (error: ProviderRpcError) => void
}

type WalletState = {
  status: WalletStatus
  accounts: WalletAccount[]
  selectedIndex: number
  chainId: number
  connections: ConnectedSite[]
  activity: ActivityItem[]
  customRpcs: Record<number, string>
  pendingApproval: PendingApproval | null
}

type CreateWalletInput = {
  mnemonic: string
  password: string
  accountCount?: number
}

type SendInput = {
  to: `0x${string}`
  amount: string
  data?: Hex
}

type WalletContextValue = WalletState & {
  selectedAccount: WalletAccount | null
  nativeSymbol: string
  chainName: string
  isTestnet: boolean
  createWallet: (input: CreateWalletInput) => Promise<void>
  unlock: (password: string) => Promise<void>
  lock: () => void
  resetWallet: () => void
  revealMnemonic: (password: string) => Promise<string>
  addAccount: () => void
  selectAccount: (index: number) => void
  switchChain: (chainId: number) => void
  sendNative: (input: SendInput) => Promise<`0x${string}`>
  estimateSend: (input: SendInput) => Promise<{ gas: bigint; fee: bigint }>
  approvePending: () => void
  rejectPending: () => void
  getBalance: () => Promise<bigint>
  disconnectOrigin: (origin: string) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

function siteName(origin: string) {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

function asParams(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value == null) return []
  return [value]
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("booting")
  const [mnemonic, setMnemonic] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN_ID)
  const [connections, setConnections] = useState<ConnectedSite[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [customRpcs, setCustomRpcs] = useState<Record<number, string>>({})
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)

  const mnemonicRef = useRef(mnemonic)
  const accountsRef = useRef(accounts)
  const selectedIndexRef = useRef(selectedIndex)
  const chainIdRef = useRef(chainId)
  const connectionsRef = useRef(connections)
  const activityRef = useRef(activity)
  const customRpcsRef = useRef(customRpcs)
  const approvalQueue = useRef<PendingApproval[]>([])

  mnemonicRef.current = mnemonic
  accountsRef.current = accounts
  selectedIndexRef.current = selectedIndex
  chainIdRef.current = chainId
  connectionsRef.current = connections
  activityRef.current = activity
  customRpcsRef.current = customRpcs

  const persistMeta = useCallback((patch: Partial<PersistedMeta> = {}) => {
    const next: PersistedMeta = {
      selectedIndex: selectedIndexRef.current,
      chainId: chainIdRef.current,
      accountCount: Math.max(accountsRef.current.length, 1),
      connections: connectionsRef.current,
      activity: activityRef.current.slice(0, 50),
      customRpcs: customRpcsRef.current,
      ...patch,
    }
    writeMeta(next)
  }, [])

  const selectedAccount = accounts[selectedIndex] ?? null
  const chainInfo = getSupportedChain(chainId)
  const nativeSymbol = chainInfo?.nativeSymbol ?? "ETH"
  const chainName = chainInfo?.chain.name ?? `Chain ${chainId}`
  const isTestnet = Boolean(chainInfo?.testnet)

  const publicClient = useMemo(() => {
    const chain = chainInfo?.chain ?? getSupportedChain(DEFAULT_CHAIN_ID)!.chain
    return createPublicClient({
      chain,
      transport: createRpcTransport(chainId, customRpcs),
    })
  }, [chainId, chainInfo, customRpcs])

  const getWalletClient = useCallback(() => {
    const phrase = mnemonicRef.current
    const account = accountsRef.current[selectedIndexRef.current]
    if (!phrase || !account) {
      throw new ProviderRpcError(UNAUTHORIZED, "Wallet is locked")
    }
    const chain = getSupportedChain(chainIdRef.current)?.chain
    if (!chain) {
      throw new ProviderRpcError(UNRECOGNIZED_CHAIN, "Unrecognized chain")
    }
    return createWalletClient({
      account: getSigner(phrase, account.index),
      chain,
      transport: createRpcTransport(chainIdRef.current, customRpcsRef.current),
    })
  }, [])

  const requestApproval = useCallback((request: Omit<ApprovalRequest, "id">) => {
    return new Promise<unknown>((resolve, reject) => {
      const pending: PendingApproval = {
        ...request,
        id: crypto.randomUUID(),
        resolve,
        reject,
      }
      approvalQueue.current.push(pending)
      setPendingApproval((current) => current ?? pending)
    })
  }, [])

  const finishApproval = useCallback((approved: boolean) => {
    setPendingApproval((current) => {
      if (!current) return null
      if (approved) current.resolve(true)
      else current.reject(new ProviderRpcError(USER_REJECTED, "User rejected the request"))
      approvalQueue.current = approvalQueue.current.filter((item) => item.id !== current.id)
      return approvalQueue.current[0] ?? null
    })
  }, [])

  const createWallet = useCallback(
    async ({ mnemonic: phrase, password, accountCount = 1 }: CreateWalletInput) => {
      const payload: VaultPayload = {
        mnemonic: phrase,
        accountCount,
        createdAt: Date.now(),
      }
      const vault = await encryptSecret(JSON.stringify(payload), password)
      writeVault(vault)
      const derived = deriveAccounts(phrase, accountCount)
      setMnemonic(phrase)
      setAccounts(derived)
      setSelectedIndex(0)
      setChainId(DEFAULT_CHAIN_ID)
      setConnections([])
      setActivity([])
      setCustomRpcs({})
      writeMeta({
        selectedIndex: 0,
        chainId: DEFAULT_CHAIN_ID,
        accountCount,
        connections: [],
        activity: [],
        customRpcs: {},
      })
      setStatus("unlocked")
    },
    []
  )

  const unlock = useCallback(async (password: string) => {
    const vault = readVault()
    if (!vault) throw new Error("No wallet found")
    const payload = JSON.parse(await decryptSecret(vault, password)) as VaultPayload
    const meta = readMeta()
    const count = Math.max(payload.accountCount, meta.accountCount, meta.selectedIndex + 1, 1)
    setMnemonic(payload.mnemonic)
    setAccounts(deriveAccounts(payload.mnemonic, count))
    setSelectedIndex(meta.selectedIndex)
    setChainId(meta.chainId)
    setConnections(meta.connections)
    setActivity(meta.activity)
    setCustomRpcs(meta.customRpcs)
    setStatus("unlocked")
  }, [])

  const lock = useCallback(() => {
    setMnemonic(null)
    setPendingApproval(null)
    approvalQueue.current.forEach((item) =>
      item.reject(new ProviderRpcError(UNAUTHORIZED, "Wallet locked"))
    )
    approvalQueue.current = []
    setStatus("locked")
    emitProviderEvent("accountsChanged", [])
  }, [])

  const resetWallet = useCallback(() => {
    clearWalletStorage()
    setMnemonic(null)
    setAccounts([])
    setConnections([])
    setActivity([])
    setPendingApproval(null)
    approvalQueue.current = []
    setStatus("welcome")
    emitProviderEvent("accountsChanged", [])
  }, [])

  const revealMnemonic = useCallback(async (password: string) => {
    const vault = readVault()
    if (!vault) throw new Error("No wallet found")
    const payload = JSON.parse(await decryptSecret(vault, password)) as VaultPayload
    return payload.mnemonic
  }, [])

  const addAccount = useCallback(() => {
    const phrase = mnemonicRef.current
    if (!phrase) return
    const next = deriveAccounts(phrase, accountsRef.current.length + 1)
    setAccounts(next)
    setSelectedIndex(next.length - 1)
    persistMeta({ selectedIndex: next.length - 1, accountCount: next.length })
    emitProviderEvent(
      "accountsChanged",
      connectionsRef.current.length ? [next[next.length - 1].address] : []
    )
  }, [persistMeta])

  const selectAccount = useCallback(
    (index: number) => {
      setSelectedIndex(index)
      persistMeta({ selectedIndex: index })
      const account = accountsRef.current[index]
      if (account && connectionsRef.current.length) {
        emitProviderEvent("accountsChanged", [account.address])
      }
    },
    [persistMeta]
  )

  const switchChain = useCallback(
    (nextChainId: number) => {
      if (!getSupportedChain(nextChainId)) {
        throw new ProviderRpcError(UNRECOGNIZED_CHAIN, "Unrecognized chain")
      }
      setChainId(nextChainId)
      persistMeta({ chainId: nextChainId })
      emitProviderEvent("chainChanged", chainIdHex(nextChainId))
    },
    [persistMeta]
  )

  const recordActivity = useCallback(
    (item: ActivityItem) => {
      setActivity((current) => {
        const next = [item, ...current.filter((row) => row.hash !== item.hash)].slice(0, 50)
        activityRef.current = next
        persistMeta({ activity: next })
        return next
      })
    },
    [persistMeta]
  )

  const sendNative = useCallback(
    async ({ to, amount, data }: SendInput) => {
      const account = accountsRef.current[selectedIndexRef.current]
      if (!account) throw new Error("No account")
      const client = getWalletClient()
      const hash = await client.sendTransaction({
        to,
        value: parseEther(amount || "0"),
        data,
      })
      recordActivity({
        hash,
        chainId: chainIdRef.current,
        from: account.address,
        to,
        value: amount,
        timestamp: Date.now(),
        status: "pending",
      })
      return hash
    },
    [getWalletClient, recordActivity]
  )

  const estimateSend = useCallback(
    async ({ to, amount, data }: SendInput) => {
      const account = accountsRef.current[selectedIndexRef.current]
      if (!account) throw new Error("No account")
      const gas = await publicClient.estimateGas({
        account: account.address,
        to,
        value: parseEther(amount || "0"),
        data,
      })
      const gasPrice = await publicClient.getGasPrice()
      return { gas, fee: gas * gasPrice }
    },
    [publicClient]
  )

  const getBalance = useCallback(async () => {
    const account = accountsRef.current[selectedIndexRef.current]
    if (!account) return 0n
    return publicClient.getBalance({ address: account.address })
  }, [publicClient])

  const disconnectOrigin = useCallback(
    (origin: string) => {
      const next = connectionsRef.current.filter((site) => site.origin !== origin)
      setConnections(next)
      persistMeta({ connections: next })
      if (next.length === 0) emitProviderEvent("accountsChanged", [])
    },
    [persistMeta]
  )

  const handleRpc = useCallback(
    async ({ method, params }: { method: string; params?: unknown }, origin: string) => {
      const list = asParams(params)
      const phrase = mnemonicRef.current
      const account = accountsRef.current[selectedIndexRef.current]
      const connected = connectionsRef.current.some((site) => site.origin === origin)

      const requireAccount = () => {
        if (!phrase || !account) {
          throw new ProviderRpcError(UNAUTHORIZED, "Wallet is locked")
        }
        return { phrase, account }
      }

      switch (method) {
        case "eth_chainId":
        case "net_version":
          return method === "eth_chainId"
            ? chainIdHex(chainIdRef.current)
            : String(chainIdRef.current)
        case "eth_accounts":
          return connected && account ? [account.address] : []
        case "eth_requestAccounts":
        case "wallet_requestPermissions": {
          requireAccount()
          if (!connected) {
            await requestApproval({
              origin,
              kind: "connect",
              method,
              title: "Connect to this site",
              summary: `${siteName(origin)} wants to see your address and ask you to sign.`,
            })
            const next = [
              { origin, name: siteName(origin), connectedAt: Date.now() },
              ...connectionsRef.current.filter((site) => site.origin !== origin),
            ]
            setConnections(next)
            persistMeta({ connections: next })
          }
          const selected = accountsRef.current[selectedIndexRef.current]
          emitProviderEvent("connect", { chainId: chainIdHex(chainIdRef.current) })
          emitProviderEvent("accountsChanged", selected ? [selected.address] : [])
          if (method === "wallet_requestPermissions") {
            return [{ parentCapability: "eth_accounts" }]
          }
          return selected ? [selected.address] : []
        }
        case "wallet_getPermissions":
          return connected ? [{ parentCapability: "eth_accounts" }] : []
        case "wallet_revokePermissions": {
          disconnectOrigin(origin)
          return null
        }
        case "personal_sign":
        case "eth_sign": {
          const { account: current } = requireAccount()
          if (!connected) throw new ProviderRpcError(UNAUTHORIZED, "Site is not connected")
          const message = method === "personal_sign" ? list[0] : list[1]
          await requestApproval({
            origin,
            kind: "sign",
            method,
            params: message,
            title: "Sign message",
            summary: messageFromHex(message),
          })
          const signer = getSigner(mnemonicRef.current!, current.index)
          if (typeof message === "string" && isHex(message)) {
            return signer.signMessage({ message: { raw: message } })
          }
          return signer.signMessage({ message: String(message ?? "") })
        }
        case "eth_signTypedData_v4":
        case "eth_signTypedData": {
          const { account: current } = requireAccount()
          if (!connected) throw new ProviderRpcError(UNAUTHORIZED, "Site is not connected")
          const raw = list[1] ?? list[0]
          const typed = typeof raw === "string" ? JSON.parse(raw) : raw
          const types = { ...(typed.types ?? {}) }
          delete types.EIP712Domain
          await requestApproval({
            origin,
            kind: "typedData",
            method,
            params: typed,
            title: "Sign typed data",
            summary: JSON.stringify(typed, null, 2),
          })
          const signer = getSigner(mnemonicRef.current!, current.index)
          return signer.signTypedData({
            domain: typed.domain,
            types,
            primaryType: typed.primaryType,
            message: typed.message,
          })
        }
        case "eth_sendTransaction": {
          const { account: current } = requireAccount()
          if (!connected) throw new ProviderRpcError(UNAUTHORIZED, "Site is not connected")
          const tx = (list[0] ?? {}) as {
            to?: string
            value?: string
            data?: Hex
            from?: string
          }
          const valueWei = tx.value
            ? isHex(tx.value)
              ? hexToBigInt(tx.value as Hex)
              : BigInt(tx.value)
            : 0n
          await requestApproval({
            origin,
            kind: "send",
            method,
            params: tx,
            title: "Send transaction",
            summary: JSON.stringify(
              {
                from: current.address,
                to: tx.to,
                value: valueWei.toString(),
                data: tx.data,
              },
              null,
              2
            ),
          })
          const client = getWalletClient()
          const hash = await client.sendTransaction({
            to: tx.to && isAddress(tx.to) ? tx.to : undefined,
            value: valueWei,
            data: tx.data,
          })
          recordActivity({
            hash,
            chainId: chainIdRef.current,
            from: current.address,
            to: tx.to && isAddress(tx.to) ? tx.to : undefined,
            value: valueWei.toString(),
            timestamp: Date.now(),
            status: "pending",
          })
          return hash
        }
        case "wallet_switchEthereumChain": {
          requireAccount()
          const requested = parseChainId((list[0] as { chainId?: string })?.chainId)
          if (!getSupportedChain(requested)) {
            throw new ProviderRpcError(UNRECOGNIZED_CHAIN, "Unrecognized chain")
          }
          if (requested !== chainIdRef.current) {
            await requestApproval({
              origin,
              kind: "switchChain",
              method,
              params: requested,
              title: "Switch network",
              summary: `Allow ${siteName(origin)} to switch Ember to ${getSupportedChain(requested)?.chain.name}.`,
            })
            switchChain(requested)
          }
          return null
        }
        case "wallet_addEthereumChain": {
          const added = list[0] as { chainId?: string; chainName?: string }
          const requested = parseChainId(added?.chainId)
          if (!getSupportedChain(requested)) {
            throw new ProviderRpcError(
              UNRECOGNIZED_CHAIN,
              `${added?.chainName ?? "This network"} is not supported in Ember yet`
            )
          }
          return handleRpc({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex(requested) }] }, origin)
        }
        case "wallet_watchAsset":
          return true
        case "eth_getBalance":
        case "eth_call":
        case "eth_estimateGas":
        case "eth_gasPrice":
        case "eth_maxPriorityFeePerGas":
        case "eth_feeHistory":
        case "eth_blockNumber":
        case "eth_getCode":
        case "eth_getTransactionCount":
        case "eth_getTransactionByHash":
        case "eth_getTransactionReceipt":
        case "eth_getBlockByNumber":
        case "eth_getBlockByHash":
        case "eth_getLogs":
        case "web3_clientVersion": {
          if (method === "web3_clientVersion") return "Ember/1.0.0"
          return publicClient.request({
            method: method as never,
            params: list as never,
          })
        }
        default:
          throw new ProviderRpcError(-32601, `Unsupported method: ${method}`)
      }
    },
    [
      disconnectOrigin,
      getWalletClient,
      persistMeta,
      publicClient,
      recordActivity,
      requestApproval,
      switchChain,
    ]
  )

  useEffect(() => {
    announceProvider()
    if (hasVault()) {
      const meta = readMeta()
      setSelectedIndex(meta.selectedIndex)
      setChainId(meta.chainId)
      setConnections(meta.connections)
      setActivity(meta.activity)
      setCustomRpcs(meta.customRpcs)
      setStatus("locked")
    } else {
      setStatus("welcome")
    }
  }, [])

  useEffect(() => {
    setRpcHandler(status === "unlocked" ? handleRpc : null)
    return () => setRpcHandler(null)
  }, [handleRpc, status])

  useEffect(() => {
    if (status !== "unlocked") return
    persistMeta()
  }, [selectedIndex, chainId, connections, activity, customRpcs, persistMeta, status])

  useEffect(() => {
    const pending = activity.filter((item) => item.status === "pending")
    if (pending.length === 0) return
    let cancelled = false

    const poll = async () => {
      for (const item of pending) {
        try {
          const receipt: TransactionReceipt | null = await publicClient.getTransactionReceipt({
            hash: item.hash,
          })
          if (!receipt || cancelled) continue
          recordActivity({
            ...item,
            status: receipt.status === "success" ? "success" : "reverted",
          })
        } catch {
          // still pending
        }
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 8_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activity, publicClient, recordActivity])

  const value: WalletContextValue = {
    status,
    accounts,
    selectedIndex,
    chainId,
    connections,
    activity,
    customRpcs,
    pendingApproval,
    selectedAccount,
    nativeSymbol,
    chainName,
    isTestnet,
    createWallet,
    unlock,
    lock,
    resetWallet,
    revealMnemonic,
    addAccount,
    selectAccount,
    switchChain,
    sendNative,
    estimateSend,
    approvePending: () => finishApproval(true),
    rejectPending: () => finishApproval(false),
    getBalance,
    disconnectOrigin,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const value = useContext(WalletContext)
  if (!value) throw new Error("useWallet must be used within WalletProvider")
  return value
}
