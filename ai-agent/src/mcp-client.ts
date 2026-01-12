// ai-agent/src/mcp-client.ts

import { MCPClient } from '@mastra/mcp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PecComplianceMetadata } from './pec-types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DiscoveredTool {
  name: string
  description: string
  compliance: PecComplianceMetadata | null
  tool: {
    name: string
    execute: (...args: unknown[]) => Promise<unknown>
  }
}

export interface McpServerConnection {
  serverName: string
  tools: DiscoveredTool[]
  disconnect: () => Promise<void>
}

const PEC_METADATA_REGEX = /\[PEC_COMPLIANCE:(\{[\s\S]*\})\]$/

function parsePecMetadataFromDescription(description: string): PecComplianceMetadata | null {
  const match = description.match(PEC_METADATA_REGEX)
  if (!match || !match[1]) {
    return null
  }

  try {
    return JSON.parse(match[1]) as PecComplianceMetadata
  } catch {
    console.error('Failed to parse PEC metadata from description')
    return null
  }
}

function getBaseDescription(description: string): string {
  return description.replace(PEC_METADATA_REGEX, '').trim()
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${message}`)), ms)
    )
  ])
}

export async function connectToMcpServer(serverPath?: string): Promise<McpServerConnection> {
  const mcpServerPath = serverPath || resolve(__dirname, '../../mcp-server/src/index.ts')

  const client = new MCPClient({
    servers: {
      pecServer: {
        command: 'npx',
        args: ['tsx', mcpServerPath],
        timeout: 15000
      }
    }
  })

  const toolsets = await withTimeout(
    client.getTools(),
    20000,
    'MCP server did not respond in time'
  )

  const tools: DiscoveredTool[] = []

  for (const [toolName, toolDef] of Object.entries(toolsets)) {
    const def = toolDef as { id?: string; description?: string; execute?: (...args: unknown[]) => Promise<unknown> }
    const description = def.description || ''
    const compliance = parsePecMetadataFromDescription(description)

    const cleanName = toolName.replace(/^pecServer_/, '')

    tools.push({
      name: cleanName,
      description: getBaseDescription(description),
      compliance,
      tool: {
        name: cleanName,
        execute: async (...args: unknown[]) => {
          return def.execute?.(...args)
        }
      }
    })
  }

  return {
    serverName: 'pec-mcp-server',
    tools,
    disconnect: async () => {
      try {
        await withTimeout(client.disconnect(), 5000, 'Disconnect timed out')
      } catch {
      }
    }
  }
}

export function formatDiscoveredToolsForFiltering(connection: McpServerConnection): Array<{
  name: string
  compliance: PecComplianceMetadata
  tool: { name: string }
}> {
  return connection.tools
    .filter((t): t is DiscoveredTool & { compliance: PecComplianceMetadata } => t.compliance !== null)
    .map(t => ({
      name: t.name,
      compliance: t.compliance,
      tool: { name: t.name }
    }))
}
