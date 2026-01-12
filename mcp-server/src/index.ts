// mcp-server/src/index.ts

import { MCPServer } from '@mastra/mcp'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { allTools, documentSummariser, textFormatter, dataExporter, healthcareAnalyser } from './tools'
import { PecComplianceMetadata } from './pec-types'

const pecMetadataRegistry: Map<string, PecComplianceMetadata> = new Map()

function registerPecMetadata(toolName: string, compliance: PecComplianceMetadata): void {
  pecMetadataRegistry.set(toolName, compliance)
}

function buildPecDescription(baseDescription: string, compliance: PecComplianceMetadata): string {
  const pecSuffix = `\n\n[PEC_COMPLIANCE:${JSON.stringify({
    pec_version: compliance.pec_version,
    processing_locations: compliance.processing_locations,
    data_retention_days: compliance.data_retention_days,
    certifications: compliance.certifications,
    ai_act_status: compliance.ai_act_status,
    gdpr: compliance.gdpr,
    suitable_for: compliance.suitable_for,
    unsuitable_for: compliance.unsuitable_for,
    supply_chain_disclosure: compliance.supply_chain_disclosure,
    metadata_currency: compliance.metadata_currency
  })}]`
  return baseDescription + pecSuffix
}

registerPecMetadata(documentSummariser.name, documentSummariser.compliance)
registerPecMetadata(textFormatter.name, textFormatter.compliance)
registerPecMetadata(dataExporter.name, dataExporter.compliance)
registerPecMetadata(healthcareAnalyser.name, healthcareAnalyser.compliance)

const documentSummariserMcp = createTool({
  id: documentSummariser.name,
  description: buildPecDescription(documentSummariser.description, documentSummariser.compliance),
  inputSchema: z.object({
    text: z.string().describe('The text to summarise')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    summary: z.string(),
    original_length: z.number(),
    summary_length: z.number()
  }),
  execute: async ({ context }: { context: { text: string } }) => {
    const result = await documentSummariser.execute(context as Record<string, unknown>)
    return result as { success: boolean; summary: string; original_length: number; summary_length: number }
  }
})

const textFormatterMcp = createTool({
  id: textFormatter.name,
  description: buildPecDescription(textFormatter.description, textFormatter.compliance),
  inputSchema: z.object({
    text: z.string().describe('The text to format'),
    format: z.enum(['uppercase', 'lowercase', 'titlecase', 'clean']).optional().describe('The format to apply')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    formatted_text: z.string(),
    format_applied: z.string()
  }),
  execute: async ({ context }: { context: { text: string; format?: string } }) => {
    const result = await textFormatter.execute(context as Record<string, unknown>)
    return result as { success: boolean; formatted_text: string; format_applied: string }
  }
})

const dataExporterMcp = createTool({
  id: dataExporter.name,
  description: buildPecDescription(dataExporter.description, dataExporter.compliance),
  inputSchema: z.object({
    data: z.record(z.unknown()).describe('The data to export')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    destination: z.string(),
    warning: z.string()
  }),
  execute: async ({ context }: { context: { data: Record<string, unknown> } }) => {
    const result = await dataExporter.execute(context as Record<string, unknown>)
    return result as { success: boolean; message: string; destination: string; warning: string }
  }
})

const healthcareAnalyserMcp = createTool({
  id: healthcareAnalyser.name,
  description: buildPecDescription(healthcareAnalyser.description, healthcareAnalyser.compliance),
  inputSchema: z.object({
    records: z.array(z.string()).describe('Medical record identifiers to analyse'),
    analysis_type: z.enum(['summary', 'trends', 'alerts']).describe('Type of analysis to perform')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.string(),
    record_count: z.number(),
    phi_processed: z.boolean()
  }),
  execute: async ({ context }: { context: { records: string[]; analysis_type: string } }) => {
    const result = await healthcareAnalyser.execute(context as Record<string, unknown>)
    return result as { success: boolean; analysis: string; record_count: number; phi_processed: boolean }
  }
})

const mastraTools = {
  [documentSummariser.name]: documentSummariserMcp,
  [textFormatter.name]: textFormatterMcp,
  [dataExporter.name]: dataExporterMcp,
  [healthcareAnalyser.name]: healthcareAnalyserMcp
}

const server = new MCPServer({
  name: 'pec-mcp-server',
  version: '1.0.0',
  tools: mastraTools
})

export function getToolsWithPecMetadata(): Array<{ name: string; compliance: PecComplianceMetadata }> {
  return allTools.map((tool: { name: string; compliance: PecComplianceMetadata }) => ({
    name: tool.name,
    compliance: tool.compliance
  }))
}

export function getPecMetadataForTool(toolName: string): PecComplianceMetadata | undefined {
  return pecMetadataRegistry.get(toolName)
}

async function main() {
  await server.startStdio()
  console.error('PEC MCP Server running on stdio')
  console.error(`Exposing ${Object.keys(mastraTools).length} tools with PEC compliance metadata`)
}

main().catch(console.error)
