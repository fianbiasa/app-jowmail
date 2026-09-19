import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full border-3 border-input bg-card px-2.5 py-2 text-base transition-[transform,box-shadow] duration-100 outline-none placeholder:text-muted-foreground focus-visible:shadow-brutal-xs focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
