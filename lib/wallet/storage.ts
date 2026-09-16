import type { EncryptedVault, PersistedMeta } from "@/lib/wallet/types"
import { DEFAULT_CHAIN_ID } from "@/lib/wallet/chains"

const VAULT_KEY = "ember.vault"
const META_KEY = "ember.meta"

const defaultMeta = (): PersistedMeta => ({
  selectedIndex: 0,
  chainId: DEFAULT_CHAIN_ID,
  accountCount: 1,
  connections: [],
  activity: [],
  customRpcs: {},
})

export function readVault(): EncryptedVault | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(VAULT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as EncryptedVault
  } catch {
    return null
  }
}

export function writeVault(vault: EncryptedVault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

export function clearWalletStorage() {
  localStorage.removeItem(VAULT_KEY)
  localStorage.removeItem(META_KEY)
}

export function readMeta(): PersistedMeta {
  if (typeof window === "undefined") return defaultMeta()
  const raw = localStorage.getItem(META_KEY)
  if (!raw) return defaultMeta()
  try {
    return { ...defaultMeta(), ...JSON.parse(raw) }
  } catch {
    return defaultMeta()
  }
}

export function writeMeta(meta: PersistedMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function hasVault() {
  return Boolean(readVault())
}
