import { generateMnemonic, english, mnemonicToAccount } from "viem/accounts"
import { validateMnemonic } from "@scure/bip39"
import type { WalletAccount } from "@/lib/wallet/types"

export function createMnemonic() {
  return generateMnemonic(english, 128)
}

export function normalizeMnemonic(value: string) {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ")
}

export function isValidMnemonic(value: string) {
  const phrase = normalizeMnemonic(value)
  const count = phrase.split(" ").length
  if (![12, 15, 18, 21, 24].includes(count)) return false
  return validateMnemonic(phrase, english)
}

export function deriveAccount(mnemonic: string, index: number): WalletAccount {
  const account = mnemonicToAccount(normalizeMnemonic(mnemonic), {
    addressIndex: index,
  })

  return {
    index,
    address: account.address,
    name: index === 0 ? "Account 1" : `Account ${index + 1}`,
  }
}

export function deriveAccounts(mnemonic: string, count: number) {
  return Array.from({ length: count }, (_, index) => deriveAccount(mnemonic, index))
}

export function getSigner(mnemonic: string, index: number) {
  return mnemonicToAccount(normalizeMnemonic(mnemonic), {
    addressIndex: index,
  })
}

export { english as bip39Wordlist }
