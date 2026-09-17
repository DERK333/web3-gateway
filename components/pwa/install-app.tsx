"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, SmartphoneIcon, XIcon } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const DISMISS_KEY = "ember.installDismissed"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone() {
  if (typeof window === "undefined") return false
  const media = window.matchMedia("(display-mode: standalone)").matches
  const ios = "standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone)
  return media || ios
}

function isIos() {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallApp() {
  const [hidden, setHidden] = useState(true)
  const [ios, setIos] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") {
      setHidden(true)
      return
    }
    setIos(isIos())
    setHidden(false)

    function onPrompt(event: Event) {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (hidden) return null

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === "accepted") {
      setHidden(true)
    }
    setPromptEvent(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1")
    setHidden(true)
  }

  return (
    <div className="shrink-0 border-t p-3">
      <Alert>
        <SmartphoneIcon />
        <AlertTitle>Install Ember on this phone</AlertTitle>
        <AlertDescription>
          {ios
            ? "In Safari, tap Share, then Add to Home Screen. Open it from the home screen like any other app. Rotate the phone for the widescreen browser."
            : promptEvent
              ? "Install Ember to your home screen. It opens full-screen, and rotating the phone still gives the widescreen wallet layout."
              : "After this site is on HTTPS, Chrome can install Ember. Use the browser menu → Install app, or Add to Home Screen."}
        </AlertDescription>
        <AlertAction>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={dismiss}>
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
      <div className="mt-2 flex gap-2">
        {promptEvent ? (
          <Button className="flex-1" onClick={() => void install()}>
            <DownloadIcon data-icon="inline-start" />
            Install app
          </Button>
        ) : null}
      </div>
    </div>
  )
}
