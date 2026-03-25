import type { Metadata } from 'next'
import { Geist_Mono, Geist, JetBrains_Mono, Inter, Merriweather } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Database Studio',
  description: 'Interactive PostgreSQL schema visualizer and query tool',
}

import { ThemeProvider } from '@/components/theme-provider'

const merriweatherHeading = Merriweather({ subsets: ['latin'], variable: '--font-heading' })

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full',
        geistMono.variable,
        'font-sans',
        inter.variable,
        merriweatherHeading.variable,
        'font-mono',
        jetbrainsMono.variable,
      )}
    >
      <body className="h-full m-0 p-0 custom-scrollbar">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  )
}
