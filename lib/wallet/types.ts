export type ApprovalKind =
  | "connect"
  | "send"
  | "sign"
  | "typedData"
  | "switchChain"
  | "addChain"
  | "watchAsset"

export type ApprovalRequest = {
  id: string
  origin: string
  kind: ApprovalKind
  method: string
  params?: unknown
  title: string
  summary: string
}

export type WalletAccount = {
  index: number
  address: `0x${string}`
  name: string
}

export type ActivityItem = {
  hash: `0x${string}`
  chainId: number
  from: `0x${string}`
  to?: `0x${string}`
  value: string
  timestamp: number
  status: "pending" | "success" | "reverted"
}

export type ConnectedSite = {
  origin: string
  name: string
  connectedAt: number
}

export type EncryptedVault = {
  v: 1
  salt: string
  iv: string
  data: string
}

export type VaultPayload = {
  mnemonic: string
  accountCount: number
  createdAt: number
}

export type PersistedMeta = {
  selectedIndex: number
  chainId: number
  accountCount: number
  connections: ConnectedSite[]
  activity: ActivityItem[]
  customRpcs: Record<number, string>
}

export class ProviderRpcError extends Error {
  code: number
  data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = "ProviderRpcError"
    this.code = code
    this.data = data
  }
}

export const USER_REJECTED = 4001
export const UNAUTHORIZED = 4100
export const DISCONNECTED = 4900
export const CHAIN_DISCONNECTED = 4901
export const UNRECOGNIZED_CHAIN = 4902
