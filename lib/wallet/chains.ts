import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  type Chain,
} from "viem/chains"
import { fallback, http } from "viem"

export type SupportedChain = {
  chain: Chain
  nativeSymbol: string
  testnet?: boolean
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  { chain: sepolia, nativeSymbol: "ETH", testnet: true },
  { chain: mainnet, nativeSymbol: "ETH" },
  { chain: base, nativeSymbol: "ETH" },
  { chain: arbitrum, nativeSymbol: "ETH" },
  { chain: optimism, nativeSymbol: "ETH" },
  { chain: polygon, nativeSymbol: "POL" },
]

export const DEFAULT_CHAIN_ID = sepolia.id

export const USDC_ADDRESSES: Partial<Record<number, `0x${string}`>> = {
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  [optimism.id]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  [polygon.id]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
}

export function getSupportedChain(chainId: number) {
  return SUPPORTED_CHAINS.find((item) => item.chain.id === chainId)
}

export const PUBLIC_RPCS: Record<number, string[]> = {
  [sepolia.id]: [
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia",
    "https://sepolia.gateway.tenderly.co",
  ],
  [mainnet.id]: ["https://ethereum-rpc.publicnode.com", "https://1rpc.io/eth"],
  [base.id]: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"],
  [arbitrum.id]: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"],
  [optimism.id]: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],
  [polygon.id]: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"],
}

export function getRpcUrl(chainId: number, customRpcs: Record<number, string> = {}) {
  if (customRpcs[chainId]) return customRpcs[chainId]
  return PUBLIC_RPCS[chainId]?.[0] ?? getSupportedChain(chainId)?.chain.rpcUrls.default.http[0]
}

export function getRpcUrls(chainId: number, customRpcs: Record<number, string> = {}) {
  const custom = customRpcs[chainId]
  const fallbacks = PUBLIC_RPCS[chainId] ?? []
  const defaults = getSupportedChain(chainId)?.chain.rpcUrls.default.http ?? []
  return [...new Set([custom, ...fallbacks, ...defaults].filter(Boolean) as string[])]
}

export function createRpcTransport(chainId: number, customRpcs: Record<number, string> = {}) {
  const urls = getRpcUrls(chainId, customRpcs)
  if (urls.length === 0) return http(undefined, { timeout: 12_000 })
  if (urls.length === 1) return http(urls[0], { timeout: 12_000 })
  return fallback(urls.map((url) => http(url, { timeout: 12_000 })))
}

export const SELECT_CHAIN_ITEMS = SUPPORTED_CHAINS.map((item) => ({
  value: String(item.chain.id),
  label: item.testnet ? `${item.chain.name} (testnet)` : item.chain.name,
}))
