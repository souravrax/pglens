import * as vscode from 'vscode'
import { ConnectionState, type ConnectionConfig } from './state.js'

export type ConnectionNode = {
  type: 'connection'
  config: ConnectionConfig
  isActive: boolean
}

export class ConnectionTreeProvider implements vscode.TreeDataProvider<ConnectionNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ConnectionNode | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor(
    private context: vscode.ExtensionContext,
    private state: ConnectionState
  ) {
    state.onDidChangeActive(() => this.refresh())
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  async getTreeItem(element: ConnectionNode): Promise<vscode.TreeItem> {
    const item = new vscode.TreeItem(
      element.config.name,
      vscode.TreeItemCollapsibleState.None
    )
    item.iconPath = element.isActive
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('terminal.ansiGreen'))
      : new vscode.ThemeIcon('database')
    item.contextValue = element.isActive ? 'connection-active' : 'connection'
    item.tooltip = element.config.url
    item.description = element.isActive ? 'active' : undefined
    return item
  }

  async getChildren(): Promise<ConnectionNode[]> {
    const connections = await this.state.getConnections()
    const active = await this.state.getActiveConnection()
    return connections.map((config) => ({
      type: 'connection' as const,
      config,
      isActive: active?.id === config.id,
    }))
  }

  async addConnection(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Connection name (e.g., local dev)',
      placeHolder: 'My Database',
    })
    if (!name) return

    const url = await vscode.window.showInputBox({
      prompt: 'PostgreSQL connection URL',
      placeHolder: 'postgres://user:pass@localhost:5432/dbname',
      validateInput: (value) => {
        if (!value) return 'Connection URL is required'
        if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
          return 'URL must start with postgres:// or postgresql://'
        }
        return null
      },
    })
    if (!url) return

    try {
      const { listSchemas } = await import('./db.js')
      const showInternal = vscode.workspace.getConfiguration('pglens').get<boolean>('showInternalSchemas', false)
      await listSchemas(url, showInternal)
    } catch (err) {
      const proceed = await vscode.window.showWarningMessage(
        `Could not connect: ${err}. Save anyway?`,
        'Yes',
        'No'
      )
      if (proceed !== 'Yes') return
    }

    await this.state.addConnection(name, url)
    this.refresh()
  }

  async selectConnection(node: ConnectionNode): Promise<void> {
    await this.state.setActiveConnection(node.config.id)
  }

  async removeConnection(node: ConnectionNode): Promise<void> {
    await this.state.removeConnection(node.config.id)
    this.refresh()
  }
}
