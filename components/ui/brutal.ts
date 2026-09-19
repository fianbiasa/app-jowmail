import { cva } from "class-variance-authority"

export const brutalShadow = cva(
  "border-foreground transition-[transform,box-shadow] duration-100 ease-out",
  {
    variants: {
      size: {
        xs: "border-2 shadow-brutal-xs hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-xs",
        sm: "border-3 shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-xs",
        md: "border-3 shadow-brutal-md hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-1 active:translate-y-1 active:shadow-brutal-sm",
        static: "border-4 shadow-brutal-md",
      },
    },
    defaultVariants: { size: "sm" },
  }
)
