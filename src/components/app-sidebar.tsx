'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { schemaStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Database,
  GitFork,
  LayoutDashboardIcon,
  ListTree,
  Puzzle,
  Route,
  Terminal,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { secureFetch } from '@/lib/api-client'

const navMain = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Tables', path: '/tables', icon: Database },
  { title: 'Query', path: '/query', icon: Terminal },
  { title: 'Visualize', path: '/visualize', icon: GitFork },
  { title: 'Triggers', path: '/triggers', icon: Zap },
  { title: 'Explain', path: '/explain', icon: Route },
  { title: 'Metadata', path: '/metadata', icon: ListTree },
  { title: 'Extensions', path: '/extensions', icon: Puzzle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpen } = useSidebar()
  const schema = useStore(schemaStore, (s) => s.schema)
  const schemas = useStore(schemaStore, (s) => s.schemas)
  const setSchemas = useStore(schemaStore, (s) => s.setSchemas)
  const selectedSchema = useStore(schemaStore, (s) => s.selectedSchema)
  const setSelectedSchema = useStore(schemaStore, (s) => s.setSelectedSchema)
  const selectedTable = useStore(schemaStore, (s) => s.selectedTable)
  const setSelectedTable = useStore(schemaStore, (s) => s.setSelectedTable)
  const search = useStore(schemaStore, (s) => s.search)
  const setSearch = useStore(schemaStore, (s) => s.setSearch)
  const activeDatabase = useStore(schemaStore, (s) => s.activeDatabase)

  const activeNav = navMain.find((r) => pathname?.startsWith(r.path))?.path ?? '/tables'

  React.useEffect(() => {
    if (!activeDatabase) return
    secureFetch('/api/schemas', activeDatabase.url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSchemas(data)
      })
      .catch(() => {})
  }, [setSchemas, activeDatabase])

  const filteredTables =
    schema?.tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* First sidebar — icon rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="md:h-8 md:p-0"
              >
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <LayoutDashboardIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">pgviz</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {schema ? `${schema.tables.length} tables` : '...'}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu className="gap-2">
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      isActive={activeNav === item.path}
                      onClick={() => {
                        router.push(item.path)
                        setOpen(true)
                      }}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Second sidebar — table list */}
      <Sidebar
        collapsible="none"
        className="hidden flex-1 md:flex"
      >
        <SidebarHeader className="gap-3 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Tables</span>
          </div>
          {schemas.length > 0 && (
            <Select
              value={selectedSchema}
              onValueChange={setSelectedSchema}
            >
              <SelectTrigger
                size="sm"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <SidebarInput
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {filteredTables.map((table) => {
                const isSelected = selectedTable === table.name
                const fkCount =
                  schema?.relations.filter(
                    (r) => r.fromTable === table.name || r.toTable === table.name,
                  ).length ?? 0

                return (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table.name)}
                    className={cn(
                      'flex w-full items-center gap-2 border-b px-4 py-2 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                    )}
                  >
                    <span className="flex-1 truncate text-left font-mono text-xs">
                      {table.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {table.columns.length}
                      </span>
                      {fkCount > 0 && (
                        <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {fkCount}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {schema && (
          <SidebarFooter className="border-t p-3">
            <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{schema.tables.length} tables</span>
              <span>{schema.relations.length} relations</span>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>
    </Sidebar>
  )
}
