'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar'
import { DataTableFilterList } from '@/components/data-table/data-table-filter-list'
import { DataTableSortList } from '@/components/data-table/data-table-sort-list'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getValidFilters } from '@/lib/data-table'
import type { ExtendedColumnFilter } from '@/types/data-table'
import { secureFetch } from '@/lib/api-client'

type ColumnInfo = { name: string; type: string }

type QueryResult = {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  columns: ColumnInfo[]
}

type Props = {
  selectedTable: string | null
  schema?: string
}

export default function DataTableViewer({ selectedTable, schema = 'public' }: Props) {
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)
  const [data, setData] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true, shallow: false }),
  )
  const [perPage, setPerPage] = useQueryState(
    'perPage',
    parseAsInteger.withDefault(20).withOptions({ clearOnDefault: true, shallow: false }),
  )
  const [sortQuery, setSortQuery] = useQueryState(
    'sort',
    parseAsString.withDefault('').withOptions({ clearOnDefault: true, shallow: false }),
  )
  const [filtersQuery, setFiltersQuery] = useQueryState(
    'filters',
    parseAsString.withDefault('').withOptions({ clearOnDefault: true, shallow: false }),
  )
  const [joinQuery, setJoinQuery] = useQueryState(
    'join',
    parseAsString.withDefault('and').withOptions({ clearOnDefault: true, shallow: false }),
  )

  const sorting = useMemo(() => {
    if (!sortQuery) return [] as { id: string; desc: boolean }[]
    try {
      return JSON.parse(sortQuery) as { id: string; desc: boolean }[]
    } catch {
      return [] as { id: string; desc: boolean }[]
    }
  }, [sortQuery])

  const filters: ExtendedColumnFilter<Record<string, unknown>>[] = useMemo(() => {
    if (!filtersQuery) return []
    try {
      return JSON.parse(filtersQuery)
    } catch {
      return []
    }
  }, [filtersQuery])

  const validFilters = useMemo(() => getValidFilters(filters), [filters])

  const fetchData = useCallback(async () => {
    if (!selectedTable || !activeDatabase) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      table: selectedTable,
      schema,
      page: String(page),
      pageSize: String(perPage),
    })

    if (sorting.length > 0) {
      params.set('sort', `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}`)
    }

    if (validFilters.length > 0) {
      const filterObj: Record<string, string> = {}
      for (const f of validFilters) {
        if (f.operator === 'iLike' && typeof f.value === 'string') {
          filterObj[f.id] = f.value
        }
      }
      if (Object.keys(filterObj).length > 0) {
        params.set('filters', JSON.stringify(filterObj))
      }
    }

    try {
      const res = await secureFetch(`/api/query?${params}`, activeDatabase.url)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Query failed')
      }
      const result: QueryResult = await res.json()
      setData(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [selectedTable, schema, page, perPage, sorting, validFilters, activeDatabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (selectedTable) {
      setPage(1)
      setSortQuery('')
      setFiltersQuery('')
      setJoinQuery('and')
    }
  }, [selectedTable, setPage, setSortQuery, setFiltersQuery, setJoinQuery])

  const columns = useMemo(() => {
    if (!data?.columns) return []
    const colHelper = createColumnHelper<Record<string, unknown>>()

    return data.columns.map((col) =>
      colHelper.accessor(col.name, {
        id: col.name,
        header: () => <span className="text-xs font-semibold">{col.name}</span>,
        cell: ({ getValue }) => {
          const val = getValue()
          if (val === null || val === undefined)
            return <span className="text-muted-foreground/40 italic text-xs">null</span>
          if (typeof val === 'boolean')
            return (
              <Badge
                variant={val ? 'default' : 'secondary'}
                className="uppercase"
              >
                {String(val)}
              </Badge>
            )
          if (typeof val === 'object') {
            const full = JSON.stringify(val, null, 2)
            const preview = JSON.stringify(val).slice(0, 80)
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <span className="font-mono text-primary/80 truncate block max-w-[200px] text-[11px] cursor-pointer hover:bg-muted/60 rounded px-1 -mx-1">
                    {preview}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto max-w-[500px] max-h-[300px] overflow-auto"
                >
                  <pre className="font-mono text-[11px] whitespace-pre-wrap break-all text-foreground/90">
                    {full}
                  </pre>
                </PopoverContent>
              </Popover>
            )
          }
          const str = String(val)
          if (str.length > 30) {
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <span className="font-mono truncate block max-w-[250px] text-foreground/90 text-[12px] cursor-pointer hover:bg-muted/60 rounded px-1 -mx-1">
                    {str}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto max-w-[500px] max-h-[300px] overflow-auto"
                >
                  <span className="font-mono text-[12px] whitespace-pre-wrap break-all text-foreground/90">
                    {str}
                  </span>
                </PopoverContent>
              </Popover>
            )
          }
          return <span className="font-mono text-foreground/90 text-[12px]">{str}</span>
        },
        enableColumnFilter: true,
        enableSorting: true,
        enableHiding: true,
        meta: {
          label: col.name,
          variant: 'text' as const,
          placeholder: `Filter ${col.name}...`,
        },
      }),
    ) as ColumnDef<Record<string, unknown>, unknown>[]
  }, [data?.columns])

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: {
      sorting,
      pagination: { pageIndex: page - 1, pageSize: perPage },
      columnFilters: validFilters.map((f) => ({ id: f.id, value: f.value })),
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSortQuery(newSorting.length > 0 ? JSON.stringify(newSorting) : '')
      setPage(1)
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater([]) : updater
      // columnFilters from tanstack are used only for display; actual filter state is in URL
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: perPage })
          : updater
      setPage(newPagination.pageIndex + 1)
      setPerPage(newPagination.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: data ? Math.ceil(data.total / perPage) : 0,
    meta: {
      queryKeys: {
        page: 'page',
        perPage: 'perPage',
        sort: 'sort',
        filters: 'filters',
        joinOperator: 'join',
      },
    },
  })

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-muted-foreground/60 text-sm italic">
        Select a table to explore data
      </div>
    )
  }

  if (loading && !data) {
    return (
      <DataTableSkeleton
        columnCount={5}
        rowCount={10}
        filterCount={2}
      />
    )
  }

  if (error) {
    return (
      <div className="p-8 text-sm font-mono text-destructive bg-destructive/5 rounded-lg m-4 border border-destructive/10">
        <div className="font-bold mb-1 uppercase tracking-wider text-[10px]">
          Error loading data
        </div>
        {error}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-background min-w-0">
      <DataTable table={table}>
        <DataTableAdvancedToolbar table={table}>
          <DataTableFilterList table={table} />
          <DataTableSortList table={table} />
          {data && (
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-auto mr-2">
              <div className="flex items-center gap-1.5 p-2 px-2 rounded-md bg-muted/40 border">
                <span className="text-foreground">{data.total}</span>
                <span>rows</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 px-2 rounded-md bg-muted/40 border">
                <span className="text-foreground">{data.columns.length}</span>
                <span>columns</span>
              </div>
            </div>
          )}
        </DataTableAdvancedToolbar>
      </DataTable>
      {loading && data && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
