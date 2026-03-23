'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react'

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
}

export default function DataTableViewer({ selectedTable }: Props) {
  const [data, setData] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const fetchData = useCallback(async () => {
    if (!selectedTable) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      table: selectedTable,
      page: String(page),
      pageSize: String(pageSize),
    })

    if (sorting.length > 0) {
      params.set('sort', `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}`)
    }

    try {
      const res = await fetch(`/api/query?${params}`)
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
  }, [selectedTable, page, pageSize, sorting])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
    setSorting([])
    setGlobalFilter('')
  }, [selectedTable])

  const columns = useMemo(() => {
    if (!data?.columns) return []
    const colHelper = createColumnHelper<Record<string, unknown>>()

    return data.columns.map((col) =>
      colHelper.accessor(col.name, {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-[11px] font-semibold"
            onClick={() => column.toggleSorting()}
          >
            <span className="truncate max-w-[120px]">{col.name}</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const val = getValue()
          if (val === null || val === undefined)
            return <span style={{ color: '#555', fontStyle: 'italic' }}>null</span>
          if (typeof val === 'boolean')
            return (
              <span
                className="text-[10px] px-1 rounded"
                style={{
                  background: val ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: val ? '#4ade80' : '#f87171',
                }}
              >
                {String(val)}
              </span>
            )
          if (typeof val === 'object')
            return (
              <span
                className="text-[10px] font-mono"
                style={{ color: '#818cf8' }}
              >
                {JSON.stringify(val).slice(0, 80)}
              </span>
            )
          return (
            <span className="text-[12px] font-mono truncate block max-w-[200px]">
              {String(val)}
            </span>
          )
        },
        meta: { type: col.type },
      }),
    )
  }, [data?.columns])

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)
      setPage(1)
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(data.total / pageSize) : 0,
  })

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  if (!selectedTable) {
    return (
      <div
        className="flex items-center justify-center h-full font-mono"
        style={{ color: '#7c7c8a' }}
      >
        Select a table from the sidebar to view its data
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div
        className="px-4 py-2 flex items-center gap-3"
        style={{ borderBottom: '1px solid #2a2a35' }}
      >
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: '#7c7c8a' }}
          />
          <input
            type="text"
            placeholder="Filter rows..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{ background: '#0e0e12', border: '1px solid #2a2a35', color: '#e2e2e8' }}
          />
        </div>
        {data && (
          <div
            className="flex items-center gap-3 text-[10px]"
            style={{ color: '#7c7c8a' }}
          >
            <span>{data.total} rows</span>
            <span>{data.columns.length} columns</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 gap-2">
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: '#6366f1' }}
            />
            <span
              className="text-[12px]"
              style={{ color: '#7c7c8a' }}
            >
              Loading...
            </span>
          </div>
        ) : error ? (
          <div
            className="p-4 text-[12px] font-mono"
            style={{ color: '#ef4444' }}
          >
            {error}
          </div>
        ) : data ? (
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="sticky top-0 px-3 py-2 whitespace-nowrap"
                      style={{
                        background: '#1e1e2e',
                        borderBottom: '1px solid #2a2a35',
                        color: '#94a3b8',
                        fontSize: 11,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid #1e1e2e' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-1.5 whitespace-nowrap"
                      style={{ borderBottom: '1px solid #1e1e2e', color: '#e2e2e8' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div
          className="px-4 py-2 flex items-center gap-1"
          style={{ borderTop: '1px solid #2a2a35' }}
        >
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="text-[11px] px-2 py-1 rounded outline-none"
            style={{ background: '#0e0e12', border: '1px solid #2a2a35', color: '#e2e2e8' }}
          >
            {[10, 20, 50, 100].map((s) => (
              <option
                key={s}
                value={s}
              >
                {s} / page
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            <PgBtn
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </PgBtn>
            <PgBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </PgBtn>
            <span
              className="text-[10px] px-2 font-mono"
              style={{ color: '#7c7c8a' }}
            >
              {page} / {totalPages}
            </span>
            <PgBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </PgBtn>
            <PgBtn
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </PgBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function PgBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded transition-colors disabled:opacity-30"
      style={{ color: '#7c7c8a' }}
    >
      {children}
    </button>
  )
}
