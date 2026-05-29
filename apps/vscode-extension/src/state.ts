import * as vscode from 'vscode'

export type ConnectionConfig = {
  id: string
  name: string
  url: string
}

const CONNECTIONS_KEY = 'pglens.connections'
const ACTIVE_CONNECTION_KEY = 'pglens.activeConnection'

export class ConnectionState {
  private _onDidChangeActive = new vscode.EventEmitter<string | null>()
  readonly onDidChangeActive = this._onDidChangeActive.event

  constructor(private context: vscode.ExtensionContext) {}

  // Non-sensitive metadata stored in globalState: [{ id, name }]
  private async getConnectionMeta(): Promise<{ id: string; name: string }[]> {
    const raw = this.context.globalState.get<string>(CONNECTIONS_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  private async setConnectionMeta(meta: { id: string; name: string }[]): Promise<void> {
    await this.context.globalState.update(CONNECTIONS_KEY, JSON.stringify(meta))
  }

  // Sensitive URLs stored in SecretStorage (OS keychain)
  private getSecretKey(id: string): string {
    return `pglens.connection.${id}`
  }

  private async getUrl(id: string): Promise<string | undefined> {
    return this.context.secrets.get(this.getSecretKey(id))
  }

  private async setUrl(id: string, url: string): Promise<void> {
    await this.context.secrets.store(this.getSecretKey(id), url)
  }

  private async deleteUrl(id: string): Promise<void> {
    await this.context.secrets.delete(this.getSecretKey(id))
  }

  async getConnections(): Promise<ConnectionConfig[]> {
    const meta = await this.getConnectionMeta()
    const configs: ConnectionConfig[] = []
    for (const m of meta) {
      const url = await this.getUrl(m.id)
      if (url) {
        configs.push({ id: m.id, name: m.name, url })
      }
    }
    return configs
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
    const meta = await this.getConnectionMeta()
    const id = crypto.randomUUID()
    meta.push({ id, name })
    await this.setConnectionMeta(meta)
    await this.setUrl(id, url)
    if (meta.length === 1) {
      await this.setActiveConnection(id)
    }
    return { id, name, url }
  }

  async removeConnection(id: string): Promise<void> {
    const meta = await this.getConnectionMeta()
    const filtered = meta.filter((c) => c.id !== id)
    await this.setConnectionMeta(filtered)
    await this.deleteUrl(id)
    const activeId = this.context.globalState.get<string>(ACTIVE_CONNECTION_KEY)
    if (activeId === id) {
      await this.setActiveConnection(filtered[0]?.id ?? null)
    }
  }
}
