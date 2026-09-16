"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { EmberMark } from "@/components/wallet/ember-mark"
import { PasswordField } from "@/components/wallet/password-field"
import { useWallet } from "@/lib/wallet/wallet-context"

export function Unlock() {
  const { unlock, resetWallet } = useWallet()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await unlock(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex h-full flex-col" onSubmit={(event) => void onSubmit(event)}>
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <EmberMark />
        <div className="min-w-0">
          <p className="font-heading text-sm font-medium">Ember is locked</p>
          <p className="text-xs text-muted-foreground">Enter your password to decrypt the vault</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-5">
        <FieldGroup>
          <PasswordField
            id="unlock-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
            error={error}
          />
        </FieldGroup>
        <div className="mt-auto flex flex-col gap-2">
          <Button type="submit" disabled={busy || password.length === 0}>
            {busy ? <Spinner data-icon="inline-start" /> : null}
            Unlock
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetWallet()
              toast.message("Local vault removed from this browser.")
            }}
          >
            Forgot password? Reset wallet
          </Button>
        </div>
      </div>
    </form>
  )
}
