import { X, ArrowRight } from 'lucide-react'
import {
  PkIcon,
  FkIcon,
  IdentityIcon,
  UniqueIcon,
  IndexedIcon,
  NullableIcon,
} from '@/lib/columnIcons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Table, Schema } from '@/lib/transform'

interface TableDetailsProps {
  table: Table
  schema: Schema
  onClose: () => void
}

export default function TableDetails({ table, schema, onClose }: TableDetailsProps) {
  const outgoingRels = schema.relations.filter((r) => r.fromTable === table.name)
  const incomingRels = schema.relations.filter((r) => r.toTable === table.name)

  return (
    <div className="absolute bottom-10 right-0 min-w-[22rem] max-w-md w-auto h-[28rem] flex flex-col border-l border-t border-border rounded-tl-2xl bg-card/95 backdrop-blur-xl z-20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
            {table.name}
          </span>
          <Badge variant="outline" className="bg-background/50">{table.columns.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onClose}>
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      <Tabs defaultValue="columns" className="flex flex-col flex-1 min-h-0">
        <TabsList variant="line" className="shrink-0 mx-3 mt-2 mb-1 w-auto">
          <TabsTrigger value="columns">Columns</TabsTrigger>
          {table.indexes.length > 0 && <TabsTrigger value="indexes">Indexes</TabsTrigger>}
          {(outgoingRels.length > 0 || incomingRels.length > 0) && <TabsTrigger value="relations">Relations</TabsTrigger>}
        </TabsList>
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
          <TabsContent value="columns" className="mt-0 h-full">
            <div className="space-y-0.5">
              {table.columns.map((col) => {
                const isPK = table.primaryKeys.includes(col.name)
                const fkRel = schema.relations.find((r) => r.fromTable === table.name && r.fromColumn === col.name)
                const isIdx = table.indexes.some((idx) => idx.columns.includes(col.name))
                const isUnique = table.indexes.some((idx) => idx.unique && idx.columns.includes(col.name))
                const isIdentity = col.defaultValue !== null && /nextval\(|generated\s+.*identity/i.test(col.defaultValue)

                return (
                  <div
                    key={col.name}
                    className={cn(
                      'flex flex-col gap-1 py-2 px-2 rounded-md transition-colors border border-transparent',
                      isPK ? 'bg-primary/5 border-primary/10' : fkRel ? 'bg-muted/50 border-border/40' : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 shrink-0 min-w-[4.5rem]">
                        {isPK && (
                          <Tooltip><TooltipTrigger asChild><span><PkIcon className="size-3 text-primary" /></span></TooltipTrigger><TooltipContent>Primary Key</TooltipContent></Tooltip>
                        )}
                        {fkRel && (
                          <Tooltip><TooltipTrigger asChild><span><FkIcon className="size-3 text-primary" /></span></TooltipTrigger><TooltipContent>Foreign Key → {fkRel.toTable}.{fkRel.toColumn}</TooltipContent></Tooltip>
                        )}
                        {isIdentity && (
                          <Tooltip><TooltipTrigger asChild><span><IdentityIcon className="size-3 text-muted-foreground" /></span></TooltipTrigger><TooltipContent>Identity</TooltipContent></Tooltip>
                        )}
                        {isUnique && !isPK && (
                          <Tooltip><TooltipTrigger asChild><span><UniqueIcon className="size-3 text-muted-foreground" /></span></TooltipTrigger><TooltipContent>Unique</TooltipContent></Tooltip>
                        )}
                        {isIdx && !isPK && (
                          <Tooltip><TooltipTrigger asChild><span><IndexedIcon className="size-3 text-muted-foreground/60" /></span></TooltipTrigger><TooltipContent>Indexed</TooltipContent></Tooltip>
                        )}
                      </div>
                      <span className={cn('font-mono text-xs flex-1 truncate', isPK ? 'text-primary font-bold' : fkRel ? 'text-primary font-semibold' : 'text-foreground font-medium')}>
                        {col.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">{col.type}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="shrink-0">
                            <NullableIcon className="size-3 text-muted-foreground/40" fill={col.nullable ? 'none' : 'currentColor'} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{col.nullable ? 'Nullable' : 'Not Null'}</TooltipContent>
                      </Tooltip>
                    </div>
                    {(col.defaultValue) && (
                      <div className="text-[9px] text-muted-foreground/40 font-mono pl-[calc(4.5rem+4px)] truncate">
                        DEFAULT {col.defaultValue}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {table.indexes.length > 0 && (
            <TabsContent value="indexes" className="mt-0 h-full">
              <div className="space-y-2 pt-1">
                {table.indexes.map((idx) => (
                  <div key={idx.name} className="flex flex-col gap-1 rounded-md p-2 bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-foreground truncate">{idx.name}</span>
                      <Badge variant={idx.unique ? 'default' : 'secondary'} className="text-[9px] h-4">
                        {idx.unique ? 'UNIQUE' : 'INDEX'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                      ({idx.columns.join(', ')})
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {(outgoingRels.length > 0 || incomingRels.length > 0) && (
            <TabsContent value="relations" className="mt-0 h-full">
              <div className="space-y-4 pt-1">
                {outgoingRels.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                      <ArrowRight className="w-2.5 h-2.5" /> Outgoing
                    </div>
                    {outgoingRels.map((rel) => (
                      <div key={rel.constraintName} className="flex flex-col gap-0.5 rounded-md p-2 bg-muted/30 border border-border/40">
                        <div className="text-[11px] font-mono font-medium text-foreground flex items-center gap-1.5">
                          {rel.fromColumn}
                          <span className="text-muted-foreground">→</span>
                          <span className="text-primary truncate">{rel.toTable}.{rel.toColumn}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground/50 font-mono truncate">{rel.constraintName}</div>
                      </div>
                    ))}
                  </div>
                )}
                {incomingRels.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                      <FkIcon className="w-2.5 h-2.5" /> Incoming
                    </div>
                    {incomingRels.map((rel) => (
                      <div key={rel.constraintName} className="flex flex-col gap-0.5 rounded-md p-2 bg-muted/30 border border-border/40">
                        <div className="text-[11px] font-mono font-medium text-foreground flex items-center gap-1.5">
                          <span className="text-primary truncate">{rel.fromTable}.{rel.fromColumn}</span>
                          <span className="text-muted-foreground">→</span>
                          {rel.toColumn}
                        </div>
                        <div className="text-[9px] text-muted-foreground/50 font-mono truncate">{rel.constraintName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
