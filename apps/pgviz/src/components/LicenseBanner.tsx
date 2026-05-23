'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getLicense, type LicenseInfo } from '@/lib/tauri-api'
import { X } from 'lucide-react'

export function LicenseBanner() {
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    getLicense().then(setLicense).catch(() => setLicense(null))
  }, [])

  if (license || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-6 py-2 text-xs text-muted-foreground">
      <p>
        <span className="font-medium">pgviz is free for personal use.</span>{' '}
        Upgrade to Pro for multi-device sync and upcoming features —{' '}
        <a
          href="https://pgviz.lemonsqueezy.com/checkout"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          $4/mo, $24/yr, or $59 lifetime
        </a>
      </p>
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}
