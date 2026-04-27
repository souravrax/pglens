'use client'

import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import DataTableViewer from '@/components/DataTableViewer'

export default function TablesPage() {
  const selectedTable = useStore(schemaStore, (s) => s.selectedTable)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)

  return (
    <DataTableViewer
      selectedTable={selectedTable}
      schema={selectedSchema}
    />
  )
}
