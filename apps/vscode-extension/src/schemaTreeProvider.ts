import * as vscode from 'vscode'
import { ConnectionState } from './state.js'
import { listSchemas } from './db.js'

export type SchemaNode = {
  type: 'schema'
  name: string
}

export class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SchemaNode | undefined | void>()
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

  async getTreeItem(element: SchemaNode): Promise<vscode.TreeItem> {
    const item = new vscode.TreeItem(
      element.name,
      vscode.TreeItemCollapsibleState.None
    )
    item.iconPath = new vscode.ThemeIcon('table')
    item.contextValue = 'schema'
    item.command = {
      command: 'pglens.visualizeSchemaFromTree',
      title: 'Visualize Schema',
      arguments: [element],
    }
    return item
  }

  async getChildren(): Promise<SchemaNode[]> {
    const active = await this.state.getActiveConnection()
    if (!active) return []

    try {
      const showInternal = vscode.workspace.getConfiguration('pglens').get<boolean>('showInternalSchemas', false)
      const schemas = await listSchemas(active.url, showInternal)
      return schemas.map((name) => ({ type: 'schema' as const, name }))
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to list schemas: ${err}`)
      return []
    }
  }

  getActiveConnection() {
    return this.state.getActiveConnection()
  }
}
