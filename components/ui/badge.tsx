import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 border-2 border-foreground px-2.5 py-0.5 text-[11px] font-black tracking-wide whitespace-nowrap uppercase [&_svg]:pointer-events-none [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-card text-foreground",
        yellow: "bg-yellow text-foreground",
        pink: "bg-pink text-foreground",
        cyan: "bg-cyan text-foreground",
        lime: "bg-lime text-foreground",
        orange: "bg-orange text-foreground",
        purple: "bg-purple text-foreground",
        red: "bg-red text-white",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
