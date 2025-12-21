import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary",
        secondary:
          "bg-secondary/10 text-secondary",
        success:
          "bg-success-light text-success",
        warning:
          "bg-warning-light text-warning",
        destructive:
          "bg-destructive/10 text-destructive",
        admin:
          "bg-admin-light text-admin",
        user:
          "bg-primary-light text-primary",
        active:
          "bg-success-light text-success",
        inactive:
          "bg-muted text-muted-foreground",
        outline: 
          "border border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }