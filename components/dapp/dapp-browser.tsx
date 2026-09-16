"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CompassIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HouseIcon,
  RefreshCwIcon,
  RotateCwSquareIcon,
  SmartphoneIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { HearthSwap } from "@/components/dapp/hearth-swap"
import { cn } from "@/lib/utils"
import {
  BOOKMARKS,
  BROWSER_HOME,
  HEARTH_SWAP,
  displayBrowserUrl,
  isInternalPage,
  normalizeBrowserUrl,
} from "@/lib/browser/sites"

type DappBrowserProps = {
  urlBarRef?: React.RefObject<HTMLInputElement | null>
}

export function DappBrowser({ urlBarRef }: DappBrowserProps) {
  const [input, setInput] = useState("")
  const [current, setCurrent] = useState(BROWSER_HOME)
  const [history, setHistory] = useState<string[]>([BROWSER_HOME])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [frameBlocked, setFrameBlocked] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const loadTimer = useRef<number | null>(null)

  const cursorRef = useRef(0)
  cursorRef.current = cursor

  function visit(raw: string, fromHistory = false) {
    const href = normalizeBrowserUrl(raw)
    setCurrent(href)
    setInput(displayBrowserUrl(href))
    setFrameBlocked(false)
    setLoading(!isInternalPage(href))
    if (!fromHistory) {
      setHistory((prev) => {
        const next = [...prev.slice(0, cursorRef.current + 1), href]
        cursorRef.current = next.length - 1
        setCursor(next.length - 1)
        return next
      })
    }
  }

  function goBack() {
    if (cursor <= 0) return
    const index = cursor - 1
    setCursor(index)
    const href = history[index]
    setCurrent(href)
    setInput(displayBrowserUrl(href))
    setFrameBlocked(false)
    setLoading(!isInternalPage(href))
  }

  function goForward() {
    if (cursor >= history.length - 1) return
    const index = cursor + 1
    setCursor(index)
    const href = history[index]
    setCurrent(href)
    setInput(displayBrowserUrl(href))
    setFrameBlocked(false)
    setLoading(!isInternalPage(href))
  }

  useEffect(() => {
    function onOpen(event: Event) {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href
      if (href) visit(href)
      urlBarRef?.current?.focus()
    }
    window.addEventListener("ember:open-browser", onOpen)
    return () => window.removeEventListener("ember:open-browser", onOpen)
  }, [urlBarRef])

  useEffect(() => {
    if (isInternalPage(current)) {
      setLoading(false)
      return
    }
    if (loadTimer.current) window.clearTimeout(loadTimer.current)
    loadTimer.current = window.setTimeout(() => {
      setLoading(false)
    }, 12_000)
    return () => {
      if (loadTimer.current) window.clearTimeout(loadTimer.current)
    }
  }, [current, reloadKey])

  const showFrame = !isInternalPage(current)

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-col gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            disabled={cursor <= 0}
            onClick={goBack}
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Forward"
            disabled={cursor >= history.length - 1}
            onClick={goForward}
          >
            <ArrowRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reload"
            onClick={() => {
              if (showFrame) {
                setLoading(true)
                setFrameBlocked(false)
                setReloadKey((value) => value + 1)
              }
            }}
          >
            <RefreshCwIcon />
          </Button>
          <form
            className="min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              visit(input || BROWSER_HOME)
            }}
          >
            <InputGroup>
              <InputGroupAddon>
                <CompassIcon />
              </InputGroupAddon>
              <InputGroupInput
                ref={urlBarRef}
                value={input}
                placeholder="Search or enter a dApp URL"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => setInput(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="submit" size="xs">
                  Go
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Home"
            onClick={() => visit(BROWSER_HOME)}
          >
            <HouseIcon />
          </Button>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground landscape:flex lg:hidden">
          <RotateCwSquareIcon />
          Widescreen · wallet sits beside this browser. Hide it for a full-width page.
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {current === BROWSER_HOME ? <BrowserHome onOpen={visit} /> : null}
        {current === HEARTH_SWAP ? <HearthSwap /> : null}
        {showFrame ? (
          <>
            <iframe
              key={`${current}-${reloadKey}`}
              ref={frameRef}
              title="dApp browser"
              src={current}
              className="size-full border-0 bg-background"
              onLoad={() => {
                setLoading(false)
                try {
                  const frame = frameRef.current
                  if (!frame) return
                  const doc = frame.contentDocument
                  if (doc && doc.location.href === "about:blank") {
                    setFrameBlocked(true)
                  }
                } catch {
                  // Cross-origin pages that loaded still throw; that means the frame worked.
                }
              }}
              onError={() => {
                setLoading(false)
                setFrameBlocked(true)
              }}
            />
            {loading ? (
              <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted">
                <div className="h-full w-1/3 animate-pulse bg-primary" />
              </div>
            ) : null}
            {frameBlocked ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6">
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>This site will not open in the in-app frame</EmptyTitle>
                    <EmptyDescription>
                      Many dApps block iframes. Keep Ember unlocked, then open the site in a new tab
                      and connect if the dApp lists Ember — or use Hearth Swap here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button render={<a href={current} target="_blank" rel="noreferrer" />} nativeButton={false}>
                      <ExternalLinkIcon data-icon="inline-start" />
                      Open in new tab
                    </Button>
                    <Button variant="outline" onClick={() => visit(HEARTH_SWAP)}>
                      Open Hearth Swap
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

function BrowserHome({ onOpen }: { onOpen: (href: string) => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-xl font-medium">dApp browser</h1>
          <Badge variant="secondary">Ember</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Open a site from the address bar, or pick a bookmark. Rotate the phone sideways for a
          widescreen layout with the wallet beside this browser.
        </p>
      </div>
      <Alert className="landscape:hidden">
        <SmartphoneIcon />
        <AlertTitle>Widescreen on rotate</AlertTitle>
        <AlertDescription>
          Turn the phone on its side to see the browser and Ember side by side. In portrait, use the
          Wallet and Browser tabs at the bottom.
        </AlertDescription>
      </Alert>
      <Alert className="hidden landscape:flex lg:hidden">
        <RotateCwSquareIcon />
        <AlertTitle>Widescreen mode</AlertTitle>
        <AlertDescription>
          Ember sits on the right so you can approve connects and signatures without leaving the page.
        </AlertDescription>
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        {BOOKMARKS.map((site) => (
          <Card key={site.id} size="sm" className="cursor-pointer" onClick={() => onOpen(site.href)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {site.internal ? <CompassIcon /> : <GlobeIcon />}
                {site.name}
              </CardTitle>
              <CardDescription>{site.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={cn("truncate font-mono text-xs text-muted-foreground")}>
                {displayBrowserUrl(site.href) || site.href}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
