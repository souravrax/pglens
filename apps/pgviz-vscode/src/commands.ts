import * as vscode from 'vscode'
import type { ConnectionTreeProvider } from './connectionTreeProvider.js'
import type { SchemaTreeProvider, SchemaNode } from './schemaTreeProvider.js'
import { ConnectionState } from './state.js'
import { extractSchema } from './db.js'
import { showSchemaVisualizer } from './webviewManager.js'

export function registerCommands(
  context: vscode.ExtensionContext,
  connectionProvider: ConnectionTreeProvider,
  schemaProvider: SchemaTreeProvider,
  state: ConnectionState
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pgviz.addConnection', () => {
      connectionProvider.addConnection()
    }),

    vscode.commands.registerCommand('pgviz.removeConnection', (node) => {
      if (node?.type === 'connection') {
        connectionProvider.removeConnection(node)
      }
    }),

    vscode.commands.registerCommand('pgviz.selectConnection', (node) => {
      if (node?.type === 'connection') {
        connectionProvider.selectConnection(node)
      }
    }),

    vscode.commands.registerCommand('pgviz.refreshConnections', () => {
      connectionProvider.refresh()
    }),

    vscode.commands.registerCommand('pgviz.refreshSchemas', () => {
      schemaProvider.refresh()
    }),

    vscode.commands.registerCommand('pgviz.visualizeSchema', async () => {
      const active = await state.getActiveConnection()
      if (!active) {
        vscode.window.showInformationMessage('Add and select a connection first.')
        return
      }
      vscode.window.showInformationMessage('Select a schema from the Schemas panel and click "Visualize Schema"')
    }),

    vscode.commands.registerCommand(
      'pgviz.visualizeSchemaFromTree',
      async (node?: SchemaNode) => {
        if (!node || node.type !== 'schema') return
        const active = await state.getActiveConnection()
        if (!active) return
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Loading schema "${node.name}"...`,
            cancellable: false,
          },
          async () => {
            const schema = await extractSchema(active.url, node.name)
            showSchemaVisualizer(context, schema)
          }
        )
      }
    )
  )
}
