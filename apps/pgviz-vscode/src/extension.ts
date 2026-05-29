import * as vscode from 'vscode'
import { ConnectionState } from './state.js'
import { SchemaTreeProvider } from './schemaTreeProvider.js'
import { registerCommands } from './commands.js'

export function activate(context: vscode.ExtensionContext) {
  const state = new ConnectionState(context)

  const schemaProvider = new SchemaTreeProvider(context, state)

  const schemaTreeView = vscode.window.createTreeView('pgviz.schemas', {
    treeDataProvider: schemaProvider,
    showCollapseAll: false,
  })

  // Update tree view description when active connection changes
  const updateDescription = async () => {
    const active = await state.getActiveConnection()
    schemaTreeView.description = active ? active.name : undefined
  }

  // Update welcome view context flags
  const updateContext = async () => {
    const connections = await state.getConnections()
    vscode.commands.executeCommand('setContext', 'pgviz:enabled', true)
    vscode.commands.executeCommand('setContext', 'pgviz:noConnections', connections.length === 0)
    vscode.commands.executeCommand('setContext', 'pgviz:hasConnections', connections.length > 0)
    updateDescription()
  }

  state.onDidChangeActive(() => {
    updateDescription()
    schemaProvider.refresh()
  })

  // Also refresh context when connections change via add/remove
  schemaProvider.onDidChangeTreeData(() => updateContext())

  // Initial context setup
  updateContext()

  registerCommands(context, schemaProvider, state, () => updateContext())

  context.subscriptions.push(schemaTreeView)
}

export function deactivate() {
  // cleanup if needed
}
