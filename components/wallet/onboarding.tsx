"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CopyIcon, ShieldAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { EmberMark } from "@/components/wallet/ember-mark"
import { PasswordField } from "@/components/wallet/password-field"
import { copyText } from "@/lib/wallet/format"
import { createMnemonic, isValidMnemonic, normalizeMnemonic } from "@/lib/wallet/hd"
import { useWallet } from "@/lib/wallet/wallet-context"

type Step = "intro" | "backup" | "confirm" | "import" | "password"

function splitWords(phrase: string) {
  return normalizeMnemonic(phrase).split(" ").filter(Boolean)
}

export function Onboarding() {
  const { createWallet } = useWallet()
  const [step, setStep] = useState<Step>("intro")
  const [mode, setMode] = useState<"create" | "import">("create")
  const [mnemonic, setMnemonic] = useState("")
  const [words, setWords] = useState<string[]>(Array(12).fill(""))
  const [checks, setChecks] = useState<{ index: number; value: string }[]>([])
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const confirmOk = useMemo(() => {
    const source = splitWords(mnemonic)
    return checks.every((item) => source[item.index] === item.value.trim().toLowerCase())
  }, [checks, mnemonic])

  function startCreate() {
    const phrase = createMnemonic()
    setMode("create")
    setMnemonic(phrase)
    const source = splitWords(phrase)
    const indices = [2, 5, 8].map((index) => ({ index, value: "" }))
    if (source.length >= 12) {
      indices[0].index = 2
      indices[1].index = 5
      indices[2].index = 8
    }
    setChecks(indices)
    setStep("backup")
  }

  function startImport() {
    setMode("import")
    setWords(Array(12).fill(""))
    setError("")
    setStep("import")
  }

  function onPaste(text: string) {
    const parts = normalizeMnemonic(text).split(" ")
    if (parts.length === 12 || parts.length === 24) {
      setWords(parts.length === 12 ? parts : parts.slice(0, 12))
      if (parts.length === 24) {
        toast.message("Ember is using the first 12 words. 24-word phrases can be pasted as a full sentence on this screen after switching counts.")
      }
    }
  }

  function submitImport() {
    const phrase = normalizeMnemonic(words.join(" "))
    if (!isValidMnemonic(phrase) || splitWords(phrase).length !== 12) {
      setError("That phrase is not a valid 12-word recovery phrase.")
      return
    }
    setError("")
    setMnemonic(phrase)
    setStep("password")
  }

  async function finish() {
    if (password.length < 8) {
      setError("Use at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await createWallet({ mnemonic, password })
      toast.success("Wallet ready. Ember stays on this device.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the wallet.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <EmberMark />
        <div className="min-w-0">
          <p className="font-heading text-sm font-medium">Ember</p>
          <p className="text-xs text-muted-foreground">Local Ethereum wallet</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        {step === "intro" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-xl font-medium">A wallet that stays in your browser</h1>
              <p className="text-sm text-muted-foreground">
                Create a new 12-word recovery phrase, or import one you already have. Ember encrypts it with your password and never sends it to a server.
              </p>
            </div>
            <Alert>
              <ShieldAlertIcon />
              <AlertTitle>Treat this like a real wallet</AlertTitle>
              <AlertDescription>
                Anyone with the phrase can spend the funds. Prefer a throwaway phrase or a testnet while you try Ember. Do not paste a phrase into a site you do not trust.
              </AlertDescription>
            </Alert>
            <div className="mt-auto flex flex-col gap-2">
              <Button size="lg" onClick={startCreate}>
                Create a new wallet
              </Button>
              <Button size="lg" variant="outline" onClick={startImport}>
                Import 12-word phrase
              </Button>
            </div>
          </>
        ) : null}

        {step === "backup" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-xl font-medium">Write down your secret phrase</h1>
              <p className="text-sm text-muted-foreground">
                This is the only way to recover Ember. Ember cannot reset it. Store it offline.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {splitWords(mnemonic).map((word, index) => (
                <div
                  key={`${word}-${index}`}
                  className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 font-mono text-sm"
                >
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  <span>{word}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await copyText(mnemonic)
                toast.success("Phrase copied. Clear your clipboard when you are done.")
              }}
            >
              <CopyIcon data-icon="inline-start" />
              Copy phrase
            </Button>
            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={() => setStep("confirm")}>I saved these words</Button>
              <Button variant="ghost" onClick={() => setStep("intro")}>
                Back
              </Button>
            </div>
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-xl font-medium">Confirm the phrase</h1>
              <p className="text-sm text-muted-foreground">
                Enter the requested words so Ember knows you actually saved them.
              </p>
            </div>
            <FieldGroup>
              {checks.map((item, index) => (
                <Field key={item.index}>
                  <FieldLabel htmlFor={`confirm-${item.index}`}>Word {item.index + 1}</FieldLabel>
                  <Input
                    id={`confirm-${item.index}`}
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={item.value}
                    onChange={(event) => {
                      const next = [...checks]
                      next[index] = { ...item, value: event.target.value }
                      setChecks(next)
                    }}
                  />
                </Field>
              ))}
            </FieldGroup>
            <div className="mt-auto flex flex-col gap-2">
              <Button disabled={!confirmOk} onClick={() => setStep("password")}>
                Continue
              </Button>
              <Button variant="ghost" onClick={() => setStep("backup")}>
                Back
              </Button>
            </div>
          </>
        ) : null}

        {step === "import" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-xl font-medium">Import a recovery phrase</h1>
              <p className="text-sm text-muted-foreground">
                Type or paste your 12 words. Ember derives the same Ethereum account MetaMask uses (`m/44'/60'/0'/0/0`).
              </p>
            </div>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel>Secret recovery phrase</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {words.map((word, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
                      <Input
                        aria-label={`Word ${index + 1}`}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={word}
                        aria-invalid={error ? true : undefined}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text")
                          if (text.trim().includes(" ")) {
                            event.preventDefault()
                            onPaste(text)
                          }
                        }}
                        onChange={(event) => {
                          const next = [...words]
                          next[index] = event.target.value.toLowerCase().trim()
                          setWords(next)
                        }}
                      />
                    </div>
                  ))}
                </div>
                {error ? <FieldDescription>{error}</FieldDescription> : null}
              </Field>
            </FieldGroup>
            <div className="mt-auto flex flex-col gap-2">
              <Button onClick={submitImport}>Import</Button>
              <Button variant="ghost" onClick={() => setStep("intro")}>
                Back
              </Button>
            </div>
          </>
        ) : null}

        {step === "password" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-xl font-medium">Password-lock this browser</h1>
              <p className="text-sm text-muted-foreground">
                Ember encrypts the phrase with AES-GCM before saving it to local storage. Unlock is required after every refresh.
              </p>
            </div>
            {mode === "import" ? (
              <Badge variant="secondary">Importing existing phrase</Badge>
            ) : (
              <Badge variant="secondary">New wallet</Badge>
            )}
            <FieldGroup>
              <PasswordField
                id="wallet-password"
                label="Password"
                value={password}
                onChange={setPassword}
                description="At least 8 characters. This password never leaves this browser."
                invalid={Boolean(error)}
              />
              <PasswordField
                id="wallet-password-confirm"
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                invalid={Boolean(error)}
                error={error}
              />
            </FieldGroup>
            <div className="mt-auto flex flex-col gap-2">
              <Button disabled={busy} onClick={() => void finish()}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                {busy ? "Encrypting…" : "Create Ember wallet"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep(mode === "import" ? "import" : "confirm")}
              >
                Back
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
