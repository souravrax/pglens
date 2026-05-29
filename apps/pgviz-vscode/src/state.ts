import * as vscode from 'vscode'

export type ConnectionConfig = {
  id: string
  name: string
  url: string
}

const CONNECTIONS_KEY = 'pgviz.connections'
const ACTIVE_CONNECTION_KEY = 'pgviz.activeConnection'

export class ConnectionState {
  private _onDidChangeActive = new vscode.EventEmitter<string | null>()
  readonly onDidChangeActive = this._onDidChangeActive.event

  constructor(private context: vscode.ExtensionContext) {}

  async getConnections(): Promise<ConnectionConfig[]> {
    const raw = this.context.globalState.get<string>(CONNECTIONS_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as ConnectionConfig[]
    } catch {
      return []
    }
  }

  async getActiveConnection(): Promise<ConnectionConfig | null> {
    const connections = await this.getConnections()
    const activeId = this.context.globalState.get<string>(ACTIVE_CONNECTION_KEY)
    if (!activeId) return connections[0] ?? null
    return connections.find((c) => c.id === activeId) ?? connections[0] ?? null
  }

  async setActiveConnection(id: string | null): Promise<void> {
    await this.context.globalState.update(ACTIVE_CONNECTION_KEY, id)
    this._onDidChangeActive.fire(id)
  }

  async addConnection(name: string, url: string): Promise<ConnectionConfig> {
    const connections = await this.getConnections()
    const id = crypto.randomUUID()
    const config: ConnectionConfig = { id, name, url }
    connections.push(config)
    await this.context.globalState.update(CONNECTIONS_KEY, JSON.stringify(connections))
    // If this is the first connection, make it active
    if (connections.length === 1) {
      await this.setActiveConnection(id)
    }
    return config
  }

  async removeConnection(id: string): Promise<void> {
    const connections = await this.getConnections()
    const filtered = connections.filter((c) => c.id !== id)
    await this.context.globalState.update(CONNECTIONS_KEY, JSON.stringify(filtered))
    // If we removed the active connection, clear it
    const activeId = this.context.globalState.get<string>(ACTIVE_CONNECTION_KEY)
    if (activeId === id) {
      await this.setActiveConnection(filtered[0]?.id ?? null)
    }
  }
}
