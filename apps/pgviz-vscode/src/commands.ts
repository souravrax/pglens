import * as vscode from 'vscode'
import type { SchemaTreeProvider, SchemaNode } from './schemaTreeProvider.js'
import { ConnectionState } from './state.js'
import { extractSchema, listSchemas } from './db.js'
import { showSchemaVisualizer } from './webviewManager.js'

export function registerCommands(
  context: vscode.ExtensionContext,
  schemaProvider: SchemaTreeProvider,
  state: ConnectionState,
  onConnectionsChanged: () => void
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pgviz.addConnection', async () => {
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
        const showInternal = vscode.workspace.getConfiguration('pgviz').get<boolean>('showInternalSchemas', false)
        await listSchemas(url, showInternal)
      } catch (err) {
        const proceed = await vscode.window.showWarningMessage(
          `Could not connect: ${err}. Save anyway?`,
          'Yes',
          'No'
        )
        if (proceed !== 'Yes') return
      }

      await state.addConnection(name, url)
      onConnectionsChanged()
      schemaProvider.refresh()
    }),

    vscode.commands.registerCommand('pgviz.removeConnection', async () => {
      const connections = await state.getConnections()
      if (connections.length === 0) {
        vscode.window.showInformationMessage('No connections to remove.')
        return
      }

      const pick = await vscode.window.showQuickPick(
        connections.map((c) => ({ label: c.name, description: c.url, id: c.id })),
        { placeHolder: 'Select connection to remove', canPickMany: false }
      )
      if (!pick) return

      const confirm = await vscode.window.showWarningMessage(
        `Remove connection "${pick.label}"?`,
        { modal: true },
        'Remove'
      )
      if (confirm !== 'Remove') return

      await state.removeConnection(pick.id)
      onConnectionsChanged()
      schemaProvider.refresh()
    }),

    vscode.commands.registerCommand('pgviz.selectConnection', async () => {
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

    vscode.commands.registerCommand('pgviz.refreshSchemas', () => {
      schemaProvider.refresh()
    }),

    vscode.commands.registerCommand('pgviz.visualizeSchema', async () => {
      const active = await state.getActiveConnection()
      if (!active) {
        vscode.window.showInformationMessage('Add and select a connection first.')
        return
      }
      vscode.window.showInformationMessage('Click a schema in the list to visualize it.')
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
