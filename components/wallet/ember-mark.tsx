"use client"

import { FlameIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function EmberMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground",
        className
      )}
    >
      <FlameIcon />
    </div>
  )
}
