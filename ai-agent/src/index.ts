// ai-agent/src/index.ts

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { allThirdPartyServers, ThirdPartyServer } from './third-party-servers'
import { filterCompliantTools } from './compliance-filter'
import { euDeploymentContext, usHealthcareContext, allDeploymentContexts } from './deployment-context'
import { DeploymentContext, PecComplianceMetadata } from './pec-types'
import { initAuditLogger } from './audit-logger'
import { connectToMcpServer, formatDiscoveredToolsForFiltering, McpServerConnection } from './mcp-client'

function runMockServerDemo(contextName: string, context: DeploymentContext) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  MOCK THIRD-PARTY SERVERS (${contextName.toUpperCase()})`)
  console.log(`${'─'.repeat(70)}\n`)

  let totalCompliant = 0
  let totalRejected = 0

  for (const server of allThirdPartyServers) {
    const toolsForFiltering = server.tools.map(t => ({
      name: t.name,
      compliance: t.compliance,
      tool: t.tool
    }))

    const { compliant, rejected } = filterCompliantTools(toolsForFiltering, context)

    totalCompliant += compliant.length
    totalRejected += rejected.length

    const status = compliant.length > 0 ? '✓' : '✗'
    console.log(`${status} ${server.vendor}`)
    console.log(`  Server: ${server.name}`)
    console.log(`  Location: ${server.tools[0]?.compliance.processing_locations.join(', ')}`)

    if (compliant.length > 0) {
      compliant.forEach(t => {
        console.log(`  → ${t.name}: COMPLIANT (${t.compliance.ai_act_status.classification} risk)`)
      })
    }
    if (rejected.length > 0) {
      rejected.forEach(r => {
        console.log(`  → ${r.tool.name}: REJECTED — ${r.result.reasons[0]}`)
      })
    }
    console.log()
  }

  console.log(`  Mock servers result: ${totalCompliant} compliant, ${totalRejected} rejected`)
  return { totalCompliant, totalRejected }
}

async function runRealMcpServerDemo(contextName: string, context: DeploymentContext, connection: McpServerConnection) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  REAL MCP SERVER via stdio (${contextName.toUpperCase()})`)
  console.log(`${'─'.repeat(70)}\n`)

  console.log(`  Server: ${connection.serverName}`)
  console.log(`  Tools discovered: ${connection.tools.length}`)
  console.log()

  const toolsForFiltering = formatDiscoveredToolsForFiltering(connection)

  if (toolsForFiltering.length === 0) {
    console.log('  ⚠ No tools with PEC metadata found')
    return { totalCompliant: 0, totalRejected: 0 }
  }

  const { compliant, rejected } = filterCompliantTools(toolsForFiltering, context)

  for (const tool of compliant) {
    console.log(`  ✓ ${tool.name}: COMPLIANT`)
    console.log(`    Location: ${tool.compliance.processing_locations.join(', ')}`)
    console.log(`    Risk: ${tool.compliance.ai_act_status.classification}`)
  }

  for (const r of rejected) {
    console.log(`  ✗ ${r.tool.name}: REJECTED`)
    console.log(`    Reason: ${r.result.reasons[0]}`)
  }

  console.log()
  console.log(`  Real MCP server result: ${compliant.length} compliant, ${rejected.length} rejected`)

  return { totalCompliant: compliant.length, totalRejected: rejected.length }
}

async function runDemo(contextName: string, context: DeploymentContext, connection: McpServerConnection) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  ${contextName.toUpperCase()} DEPLOYMENT CONTEXT`)
  console.log(`${'═'.repeat(70)}`)

  const auditLogger = initAuditLogger(context)

  console.log(`
  Governing Law:        ${context.governing_law}
  Jurisdiction:         ${context.jurisdiction}
  Max Risk:             ${context.risk_classification.maximum_permitted}
  Required Locations:   ${context.data_residency.required.join(', ')}
  Prohibited Locations: ${context.data_residency.prohibited.join(', ')}
  `)

  const mockResult = runMockServerDemo(contextName, context)

  const realResult = await runRealMcpServerDemo(contextName, context, connection)

  const totalCompliant = mockResult.totalCompliant + realResult.totalCompliant
  const totalRejected = mockResult.totalRejected + realResult.totalRejected

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`  COMBINED RESULT: ${totalCompliant} tools compliant, ${totalRejected} tools rejected`)
  console.log(`${'─'.repeat(70)}`)

  auditLogger.logAgentInitialisation(totalCompliant, totalRejected)

  const auditLogPath = resolve(__dirname, `../../audit-log-${contextName}.json`)
  writeFileSync(auditLogPath, auditLogger.exportAsJson())
  console.log(`  Audit log: ${auditLogPath}`)
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  PEC (Protocol-Embedded Compliance) Demonstration                    ║
║                                                                      ║
║  This demo shows:                                                    ║
║  • 6 MOCK third-party MCP servers (in-memory)                        ║
║  • 1 REAL MCP server connected via stdio                             ║
║  • Each declares compliance using the SAME PEC schema                ║
║  • ONE filtering implementation works for ALL                        ║
║                                                                      ║
║  The value: Standardisation enables interoperability                 ║
╚══════════════════════════════════════════════════════════════════════╝`)

  console.log(`
Third-party servers (mock):
  • Acme Translation Services (Dublin)     — IE, FR
  • GlobalPay Inc (San Francisco)          — US, SG
  • SwissVault AG (Zurich)                 — CH
  • Tokyo AI Labs (Tokyo)                  — JP
  • Beijing Cloud Services (Beijing)       — CN
  • MedixUS Healthcare Analytics (Boston)  — US
`)

  console.log(`${'═'.repeat(70)}`)
  console.log(`  CONNECTING TO REAL MCP SERVER VIA STDIO...`)
  console.log(`${'═'.repeat(70)}\n`)

  let connection: McpServerConnection

  try {
    connection = await connectToMcpServer()
    console.log(`  ✓ Connected to: ${connection.serverName}`)
    console.log(`  ✓ Discovered ${connection.tools.length} tools with PEC metadata\n`)

    for (const tool of connection.tools) {
      console.log(`    • ${tool.name}`)
      if (tool.compliance) {
        console.log(`      Locations: ${tool.compliance.processing_locations.join(', ')}`)
        console.log(`      Risk: ${tool.compliance.ai_act_status.classification}`)
      } else {
        console.log(`      ⚠ No PEC metadata`)
      }
    }
  } catch (error) {
    console.error(`  ✗ Failed to connect to MCP server: ${error}`)
    console.error(`  Continuing with mock servers only...\n`)
    connection = {
      serverName: 'pec-mcp-server (offline)',
      tools: [],
      disconnect: async () => {}
    }
  }

  await runDemo('eu-general', euDeploymentContext, connection)
  await runDemo('us-healthcare', usHealthcareContext, connection)

  try {
    await connection.disconnect()
    console.log(`\n  ✓ Disconnected from MCP server`)
  } catch {
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  Summary                                                             ║
║                                                                      ║
║  This demo connected to a REAL MCP server via stdio and              ║
║  dynamically discovered tools with embedded PEC metadata.            ║
║                                                                      ║
║  Same PEC schema + Same filtering logic = Works across all servers   ║
║                                                                      ║
║  Without a standard: Custom code for each MCP server                 ║
║  With PEC: Declare once, filter everywhere                           ║
╚══════════════════════════════════════════════════════════════════════╝
`)
}

main()
