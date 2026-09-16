import { formatEther, formatUnits, hexToString, isHex } from "viem"

export function shortenAddress(address: string, size = 4) {
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`
}

export function formatEth(value: bigint, digits = 6) {
  const asNumber = Number(formatEther(value))
  if (!Number.isFinite(asNumber)) return formatEther(value)
  if (asNumber === 0) return "0"
  if (asNumber < 0.000001) return "< 0.000001"
  return asNumber.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })
}

export function formatToken(value: bigint, decimals: number, digits = 4) {
  const asNumber = Number(formatUnits(value, decimals))
  if (!Number.isFinite(asNumber)) return formatUnits(value, decimals)
  if (asNumber === 0) return "0"
  return asNumber.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })
}

export function messageFromHex(value: unknown) {
  if (typeof value !== "string") return String(value ?? "")
  if (isHex(value)) {
    try {
      const decoded = hexToString(value)
      if ([...decoded].every((ch) => ch === "\n" || ch >= " ")) {
        return decoded
      }
    } catch {
      return value
    }
  }
  return value
}

export function chainIdHex(chainId: number) {
  return `0x${chainId.toString(16)}` as const
}

export function parseChainId(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string") return Number.parseInt(value, value.startsWith("0x") ? 16 : 10)
  throw new Error("Invalid chain id")
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}
