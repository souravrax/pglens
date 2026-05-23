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
    <div className="flex items-center justify-between gap-4 border-b bg-amber-50 px-6 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <p>
        <span className="font-semibold">Personal use is free.</span> Commercial use requires a license —{' '}
        <a
          href="https://pgviz.lemonsqueezy.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Buy on Lemon Squeezy
        </a>
      </p>
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-6 w-6 shrink-0 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        onClick={() => setDismissed(true)}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}
