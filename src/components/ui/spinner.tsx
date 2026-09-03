"use client"

import { Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const tCommon = useTranslations("common");
  return (
    <Loader2Icon
      role="status"
      aria-label={tCommon("loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
