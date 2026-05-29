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
    vscode.commands.registerCommand('pglens.addConnection', () => {
      connectionProvider.addConnection()
    }),

    vscode.commands.registerCommand('pglens.removeConnection', (node) => {
      if (node?.type === 'connection') {
        connectionProvider.removeConnection(node)
      }
    }),

    vscode.commands.registerCommand('pglens.selectConnection', async (node?) => {
      if (node?.type === 'connection') {
        if (node.isActive) {
          vscode.window.showInformationMessage('This connection is already active')
          return
        }
        await connectionProvider.selectConnection(node)
        return
      }

      // Called from welcome view or title bar — show QuickPick
      const connections = await state.getConnections()
      if (connections.length === 0) {
        vscode.window.showInformationMessage('No connections. Add one first.')
        return
      }

      const active = await state.getActiveConnection()
      const pick = await vscode.window.showQuickPick(
        connections.map((c) => ({
          label: c.id === active?.id ? `$(check) ${c.name}` : c.name,
          description: c.id === active?.id ? 'active' : undefined,
          id: c.id,
        })),
        { placeHolder: 'Select active connection', canPickMany: false }
      )
      if (!pick) return

      await state.setActiveConnection(pick.id)
    }),

    vscode.commands.registerCommand('pglens.deselectConnection', async (node?) => {
      if (node?.type === 'connection' && !node.isActive) {
        vscode.window.showInformationMessage('This connection is not active')
        return
      }
      await state.setActiveConnection(null)
    }),

    vscode.commands.registerCommand('pglens.refreshConnections', () => {
      connectionProvider.refresh()
    }),

    vscode.commands.registerCommand('pglens.refreshSchemas', () => {
      schemaProvider.refresh()
    }),

    vscode.commands.registerCommand('pglens.visualizeSchema', async () => {
      const active = await state.getActiveConnection()
      if (!active) {
        vscode.window.showInformationMessage('Add and select a connection first.')
        return
      }
      vscode.window.showInformationMessage('Select a schema from the Schemas panel and click "Visualize Schema"')
    }),

    vscode.commands.registerCommand(
      'pglens.visualizeSchemaFromTree',
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
