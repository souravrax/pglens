import { useState, useEffect } from 'react'
import SchemaGraph from './components/SchemaGraph'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Schema } from '@/lib/transform'

export default function App() {
  const [schema, setSchema] = useState<Schema | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Notify extension host that webview is ready
    const vscodeApi = acquireVsCodeApi?.()
    if (vscodeApi) {
      vscodeApi.postMessage({ type: 'ready' })
    }
    setIsReady(true)

    const handler = (event: MessageEvent) => {
      const message = event.data
      console.log('[pglens webview] received message:', message?.type, message)
      if (message?.type === 'schema') {
        console.log('[pglens webview] schema tables:', message.data?.tables?.length)
        setSchema(message.data as Schema)
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!schema) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        {isReady ? 'Waiting for schema data...' : 'Loading...'}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <SchemaGraph schema={schema} />
    </TooltipProvider>
  )
}

// VS Code API is injected by the webview environment
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void
  setState(state: unknown): void
  getState(): unknown
}
