"use client"

import { cn } from "@/lib/utils"

function hueFromAddress(address: string) {
  const seed = Number.parseInt(address.slice(2, 10), 16) || 1
  return seed % 360
}

export function Identicon({
  address,
  size = 40,
  className,
}: {
  address: string
  size?: number
  className?: string
}) {
  const hue = hueFromAddress(address || "0x0")
  const cells: boolean[] = []
  const bytes = address.replace(/^0x/, "").padEnd(32, "0")

  for (let i = 0; i < 15; i += 1) {
    cells.push(Number.parseInt(bytes[i] ?? "0", 16) % 2 === 0)
  }

  const grid: boolean[][] = []
  for (let row = 0; row < 5; row += 1) {
    const left = [cells[row * 3], cells[row * 3 + 1], cells[row * 3 + 2]]
    grid.push([left[0], left[1], left[2], left[1], left[0]])
  }

  return (
    <svg
      viewBox="0 0 5 5"
      width={size}
      height={size}
      className={cn("rounded-full ring-1 ring-foreground/10", className)}
      aria-hidden
    >
      <rect width="5" height="5" fill={`oklch(0.92 0.03 ${hue})`} />
      {grid.flatMap((row, y) =>
        row.map((fill, x) =>
          fill ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={`oklch(0.58 0.14 ${hue})`}
            />
          ) : null
        )
      )}
    </svg>
  )
}
