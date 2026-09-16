import type { EIP1193Provider, EIP1193EventMap } from "viem"
import { ProviderRpcError, UNAUTHORIZED } from "@/lib/wallet/types"

type Listener<T = unknown> = (payload: T) => void

const CHANNEL = "ember-wallet-rpc"

type RpcRequestMsg = {
  type: "request"
  id: string
  origin: string
  payload: { method: string; params?: unknown }
}

type RpcResponseMsg =
  | { type: "response"; id: string; result: unknown }
  | { type: "error"; id: string; error: { code: number; message: string } }

type RpcEventMsg = {
  type: "event"
  event: string
  params: unknown[]
}

type ChannelMsg = RpcRequestMsg | RpcResponseMsg | RpcEventMsg

type RequestArgs = {
  method: string
  params?: unknown
}

type Handler = (args: RequestArgs, origin: string) => Promise<unknown>

const listeners = new Map<string, Set<Listener>>()
let handler: Handler | null = null
let channel: BroadcastChannel | null = null

function emitLocal(event: string, ...params: unknown[]) {
  listeners.get(event)?.forEach((fn) => {
    try {
      fn(params.length === 1 ? params[0] : params)
    } catch {
      // ignore listener errors
    }
  })
}

function postEvent(event: string, ...params: unknown[]) {
  emitLocal(event, ...params)
  channel?.postMessage({ type: "event", event, params } satisfies RpcEventMsg)
}

export function emitProviderEvent(event: string, ...params: unknown[]) {
  postEvent(event, ...params)
}

export function setRpcHandler(next: Handler | null) {
  handler = next
}

async function handleRequest(args: RequestArgs, origin: string) {
  if (!handler) {
    throw new ProviderRpcError(UNAUTHORIZED, "Ember is locked")
  }
  return handler(args, origin)
}

function ensureChannel() {
  if (typeof window === "undefined" || channel) return
  channel = new BroadcastChannel(CHANNEL)
  channel.addEventListener("message", async (event: MessageEvent<ChannelMsg>) => {
    const data = event.data
    if (!data || data.type !== "request") return
    try {
      const result = await handleRequest(data.payload, data.origin)
      channel?.postMessage({ type: "response", id: data.id, result } satisfies RpcResponseMsg)
    } catch (error) {
      const rpcError =
        error instanceof ProviderRpcError
          ? error
          : new ProviderRpcError(-32603, error instanceof Error ? error.message : "Internal error")
      channel?.postMessage({
        type: "error",
        id: data.id,
        error: { code: rpcError.code, message: rpcError.message },
      } satisfies RpcResponseMsg)
    }
  })
}

export const emberProvider: EIP1193Provider & {
  isEmber: true
  isMetaMask?: boolean
  providers?: unknown[]
} = {
  isEmber: true,
  request: async (args) => {
    ensureChannel()
    const origin = typeof window === "undefined" ? "ember://wallet" : window.location.origin
    return handleRequest(
      { method: args.method, params: args.params as unknown },
      origin
    ) as Promise<never>
  },
  on: (event, listener) => {
    const key = String(event)
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(listener as Listener)
    return emberProvider
  },
  removeListener: (event, listener) => {
    listeners.get(String(event))?.delete(listener as Listener)
    return emberProvider
  },
}

export function announceProvider() {
  if (typeof window === "undefined") return
  ensureChannel()

  const info = {
    uuid: "8f2c0d6a-6a2e-4f3a-9e7c-emberwallet0001",
    name: "Ember",
    icon: WALLET_ICON,
    rdns: "app.ember.wallet",
  }

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info, provider: emberProvider }),
      })
    )
  }

  window.addEventListener("eip6963:requestProvider", announce)
  announce()

  const ethereum = window as Window & { ethereum?: typeof emberProvider }
  if (!ethereum.ethereum) {
    ethereum.ethereum = emberProvider
  } else if (
    ethereum.ethereum &&
    !Array.isArray(ethereum.ethereum.providers) &&
    ethereum.ethereum !== emberProvider
  ) {
    const existing = ethereum.ethereum
    ethereum.ethereum = Object.assign(emberProvider, {
      providers: [emberProvider, existing],
    })
  }
}

export function createRemoteProvider(origin = typeof window === "undefined" ? "" : window.location.origin) {
  ensureChannel()
  const pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: ProviderRpcError) => void }
  >()

  const remoteListeners = new Map<string, Set<Listener>>()

  const localChannel = new BroadcastChannel(CHANNEL)
  localChannel.addEventListener("message", (event: MessageEvent<ChannelMsg>) => {
    const data = event.data
    if (!data) return
    if (data.type === "response") {
      pending.get(data.id)?.resolve(data.result)
      pending.delete(data.id)
    }
    if (data.type === "error") {
      pending.get(data.id)?.reject(new ProviderRpcError(data.error.code, data.error.message))
      pending.delete(data.id)
    }
    if (data.type === "event") {
      remoteListeners.get(data.event)?.forEach((fn) => fn(data.params.length === 1 ? data.params[0] : data.params))
    }
  })

  const provider: EIP1193Provider & { isEmber: true } = {
    isEmber: true,
    request: ({ method, params }) => {
      const id = crypto.randomUUID()
      return new Promise((resolve, reject) => {
        pending.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        })
        localChannel.postMessage({
          type: "request",
          id,
          origin,
          payload: { method, params },
        } satisfies RpcRequestMsg)
      }) as Promise<never>
    },
    on: (event, listener) => {
      const key = String(event)
      if (!remoteListeners.has(key)) remoteListeners.set(key, new Set())
      remoteListeners.get(key)!.add(listener as Listener)
      return provider
    },
    removeListener: (event, listener) => {
      remoteListeners.get(String(event))?.delete(listener as Listener)
      return provider
    },
  }

  return provider
}

const WALLET_ICON =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIjPjxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgcng9IjgiIGZpbGw9IiNjNDVjMTYiLz48cGF0aCBkPSJNMTYgNmMtLjQgMi42LTIuMiA0LjgtNS4yIDYuMiAyLjQgMS4yIDQuMiAzLjQgNC44IDUuNi40LTIuMiAyLjQtNC40IDQuOC01LjZDMTguMiAxMC44IDE2LjQgOC42IDE2IDZaIiBmaWxsPSIjZmJlN2M2Ii8+PHBhdGggZD0iTTE2IDEzLjVjLTEuNiAyLjItMy40IDMuNy01LjcgNC43IDIuNSAxLjEgNC4zIDIuOCA1LjIgNS4zLjktMi41IDIuNy00LjIgNS4yLTUuMy0yLjMtMS0xLjEtMi41LTQuNy00Ljd6IiBmaWxsPSIjZmZmN2VkIi8+PC9zdmc+"

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<{
      info: { uuid: string; name: string; icon: string; rdns: string }
      provider: EIP1193Provider
    }>
    "eip6963:requestProvider": Event
  }
}

export type { EIP1193EventMap }
