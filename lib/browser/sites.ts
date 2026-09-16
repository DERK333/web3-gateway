export type Bookmark = {
  id: string
  name: string
  description: string
  href: string
  internal?: boolean
}

export const BROWSER_HOME = "ember://home"
export const HEARTH_SWAP = "ember://swap"

export const BOOKMARKS: Bookmark[] = [
  {
    id: "hearth",
    name: "Hearth Swap",
    description: "Built-in demo dApp that talks to Ember",
    href: HEARTH_SWAP,
    internal: true,
  },
  {
    id: "uniswap",
    name: "Uniswap",
    description: "Swap tokens on Ethereum L2s",
    href: "https://app.uniswap.org",
  },
  {
    id: "aave",
    name: "Aave",
    description: "Lend and borrow on-chain",
    href: "https://app.aave.com",
  },
  {
    id: "jumper",
    name: "Jumper",
    description: "Bridge and swap across chains",
    href: "https://jumper.exchange",
  },
  {
    id: "base",
    name: "Base",
    description: "Bridge to Base",
    href: "https://bridge.base.org",
  },
  {
    id: "faucet",
    name: "Sepolia faucet",
    description: "Get test ETH for Sepolia",
    href: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
  },
]

export function normalizeBrowserUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return BROWSER_HOME
  const lower = trimmed.toLowerCase()
  if (lower === "ember://home" || lower === "home") return BROWSER_HOME
  if (lower === "ember://swap" || lower === "hearth" || lower === "hearth.swap") {
    return HEARTH_SWAP
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^ember:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function displayBrowserUrl(href: string) {
  if (href === BROWSER_HOME) return ""
  if (href === HEARTH_SWAP) return "ember://swap"
  return href.replace(/^https:\/\//, "")
}

export function isInternalPage(href: string) {
  return href.startsWith("ember://")
}
