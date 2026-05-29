import * as vscode from 'vscode'
import { ConnectionState } from './state.js'
import { ConnectionTreeProvider } from './connectionTreeProvider.js'
import { SchemaTreeProvider } from './schemaTreeProvider.js'
import { registerCommands } from './commands.js'

export function activate(context: vscode.ExtensionContext) {
  // Ensure our sidebar view is visible by setting the context
  vscode.commands.executeCommand('setContext', 'pgviz:enabled', true)

  const state = new ConnectionState(context)

  const connectionProvider = new ConnectionTreeProvider(context, state)
  const schemaProvider = new SchemaTreeProvider(context, state)

  const connectionTreeView = vscode.window.createTreeView('pgviz.connections', {
    treeDataProvider: connectionProvider,
    showCollapseAll: false,
  })

  const schemaTreeView = vscode.window.createTreeView('pgviz.schemas', {
    treeDataProvider: schemaProvider,
    showCollapseAll: false,
  })

  registerCommands(context, connectionProvider, schemaProvider, state)

  context.subscriptions.push(connectionTreeView, schemaTreeView)
}

export function deactivate() {
  // cleanup if needed
}
