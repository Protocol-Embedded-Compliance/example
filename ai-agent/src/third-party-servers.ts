// ai-agent/src/third-party-servers.ts

import { createTool, type ToolAction } from '@mastra/core/tools'
import { z } from 'zod'
import { PecComplianceMetadata } from './pec-types'

export interface ThirdPartyServer {
  name: string
  vendor: string
  tools: Array<{
    tool: ToolAction<any, any, any>
    compliance: PecComplianceMetadata
    name: string
  }>
}

const acmeTranslationCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['IE', 'FR'],
  data_retention_days: 7,
  certifications: ['ISO_27001', 'SOC2_TYPE_II'],
  ai_act_status: {
    classification: 'minimal',
    conformity_assessed: true,
    notified_body: 'BSI_Group'
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['translation', 'localisation', 'content'],
  unsuitable_for: ['legal_documents', 'medical_records'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-10T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const acmeTranslationTool = createTool({
  id: 'acme_translate',
  description: 'Translates text between languages. Provided by Acme Translation Services Ltd.',
  inputSchema: z.object({
    text: z.string().describe('Text to translate'),
    target_language: z.string().describe('Target language code')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    translated_text: z.string(),
    source_language: z.string(),
    target_language: z.string()
  }),
  execute: async ({ context }) => {
    const { text, target_language } = context
    return {
      success: true,
      translated_text: `[Translated to ${target_language}]: ${text}`,
      source_language: 'auto-detected',
      target_language
    }
  }
})

export const acmeTranslationServer: ThirdPartyServer = {
  name: 'acme-translation-server',
  vendor: 'Acme Translation Services Ltd (Dublin)',
  tools: [
    {
      tool: acmeTranslationTool,
      compliance: acmeTranslationCompliance,
      name: 'acme_translate'
    }
  ]
}

const globalPayCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['US', 'SG'],
  data_retention_days: 2555,
  certifications: ['PCI_DSS', 'SOC2_TYPE_II'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['SCCS_2021'],
    dpa_registered: false,
    special_categories_processed: false
  },
  suitable_for: ['payment_processing', 'fraud_detection', 'financial_analytics'],
  unsuitable_for: ['healthcare', 'biometric'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-05T00:00:00Z',
    update_frequency: 'monthly'
  }
}

const globalPayFraudCheckTool = createTool({
  id: 'globalpay_fraud_check',
  description: 'Checks transactions for fraud indicators. Provided by GlobalPay Inc.',
  inputSchema: z.object({
    transaction_id: z.string().describe('Transaction identifier'),
    amount: z.number().describe('Transaction amount')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    risk_score: z.number(),
    recommendation: z.string()
  }),
  execute: async ({ context }) => {
    const { transaction_id, amount } = context
    const riskScore = amount > 10000 ? 0.7 : 0.1
    return {
      success: true,
      risk_score: riskScore,
      recommendation: riskScore > 0.5 ? 'REVIEW' : 'APPROVE'
    }
  }
})

export const globalPayServer: ThirdPartyServer = {
  name: 'globalpay-mcp-server',
  vendor: 'GlobalPay Inc (San Francisco)',
  tools: [
    {
      tool: globalPayFraudCheckTool,
      compliance: globalPayCompliance,
      name: 'globalpay_fraud_check'
    }
  ]
}

const swissVaultCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['CH'],
  data_retention_days: 3650,
  certifications: ['ISO_27001', 'SOC2_TYPE_II', 'FINMA_COMPLIANT'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: true,
    notified_body: 'SGS_SA'
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['document_storage', 'secure_archival', 'financial_records'],
  unsuitable_for: ['real_time_processing', 'streaming'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-08T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const swissVaultStoreTool = createTool({
  id: 'swissvault_store',
  description: 'Securely stores documents in Swiss data centres. Provided by SwissVault AG.',
  inputSchema: z.object({
    document_id: z.string().describe('Document identifier'),
    content: z.string().describe('Document content to store')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    vault_reference: z.string(),
    encrypted: z.boolean()
  }),
  execute: async ({ context }) => {
    const { document_id } = context
    return {
      success: true,
      vault_reference: `CH-VAULT-${document_id}-${Date.now()}`,
      encrypted: true
    }
  }
})

export const swissVaultServer: ThirdPartyServer = {
  name: 'swissvault-mcp-server',
  vendor: 'SwissVault AG (Zurich)',
  tools: [
    {
      tool: swissVaultStoreTool,
      compliance: swissVaultCompliance,
      name: 'swissvault_store'
    }
  ]
}

const tokyoAiLabsCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['JP'],
  data_retention_days: 30,
  certifications: ['ISO_27001', 'JIPDEC_PRIVACY_MARK'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: true
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['image_analysis', 'ocr', 'document_processing'],
  unsuitable_for: ['biometric_identification', 'facial_recognition'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-11T00:00:00Z',
    update_frequency: 'daily'
  }
}

const tokyoAiOcrTool = createTool({
  id: 'tokyoai_ocr',
  description: 'Extracts text from images using advanced OCR. Provided by Tokyo AI Labs.',
  inputSchema: z.object({
    image_url: z.string().describe('URL of image to process')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    extracted_text: z.string(),
    confidence: z.number()
  }),
  execute: async ({ context }) => {
    return {
      success: true,
      extracted_text: '[Simulated OCR output from image]',
      confidence: 0.95
    }
  }
})

export const tokyoAiLabsServer: ThirdPartyServer = {
  name: 'tokyoai-mcp-server',
  vendor: 'Tokyo AI Labs Inc (Tokyo)',
  tools: [
    {
      tool: tokyoAiOcrTool,
      compliance: tokyoAiLabsCompliance,
      name: 'tokyoai_ocr'
    }
  ]
}

const beijingCloudCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['CN'],
  data_retention_days: 180,
  certifications: ['MLPS_LEVEL_3'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'controller',
    transfer_mechanisms: [],
    dpa_registered: false,
    special_categories_processed: false
  },
  suitable_for: ['general_compute', 'batch_processing'],
  unsuitable_for: ['eu_personal_data', 'gdpr_scope', 'us_government'],
  supply_chain_disclosure: false,
  metadata_currency: {
    last_updated: '2025-11-01T00:00:00Z',
    update_frequency: 'monthly'
  }
}

const beijingCloudComputeTool = createTool({
  id: 'beijingcloud_compute',
  description: 'General purpose compute service. Provided by Beijing Cloud Services.',
  inputSchema: z.object({
    task: z.string().describe('Compute task description')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.string()
  }),
  execute: async ({ context }) => {
    return {
      success: true,
      result: 'Compute task completed'
    }
  }
})

export const beijingCloudServer: ThirdPartyServer = {
  name: 'beijingcloud-mcp-server',
  vendor: 'Beijing Cloud Services (Beijing)',
  tools: [
    {
      tool: beijingCloudComputeTool,
      compliance: beijingCloudCompliance,
      name: 'beijingcloud_compute'
    }
  ]
}

const medixUsCompliance: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['US'],
  data_retention_days: 2555,
  certifications: ['HIPAA_COMPLIANT', 'SOC2_TYPE_II', 'HITRUST'],
  ai_act_status: {
    classification: 'high',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: [],
    dpa_registered: false,
    special_categories_processed: true
  },
  suitable_for: ['healthcare_analysis', 'medical_records', 'clinical_research'],
  unsuitable_for: ['eu_personal_data', 'gdpr_scope'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-08T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const medixUsAnalysisTool = createTool({
  id: 'medixus_analyse',
  description: 'Analyses medical records for US healthcare providers. HIPAA compliant.',
  inputSchema: z.object({
    record_ids: z.array(z.string()).describe('Medical record IDs to analyse')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.string(),
    phi_processed: z.boolean()
  }),
  execute: async ({ context }) => {
    const { record_ids } = context
    return {
      success: true,
      analysis: `Analysed ${record_ids.length} records`,
      phi_processed: true
    }
  }
})

export const medixUsServer: ThirdPartyServer = {
  name: 'medixus-mcp-server',
  vendor: 'MedixUS Healthcare Analytics (Boston)',
  tools: [
    {
      tool: medixUsAnalysisTool,
      compliance: medixUsCompliance,
      name: 'medixus_analyse'
    }
  ]
}

export const allThirdPartyServers: ThirdPartyServer[] = [
  acmeTranslationServer,
  globalPayServer,
  swissVaultServer,
  tokyoAiLabsServer,
  beijingCloudServer,
  medixUsServer
]

export function getAllThirdPartyTools(): Array<{
  tool: ToolAction<any, any, any>
  compliance: PecComplianceMetadata
  name: string
  serverName: string
  vendor: string
}> {
  return allThirdPartyServers.flatMap(server =>
    server.tools.map(t => ({
      ...t,
      serverName: server.name,
      vendor: server.vendor
    }))
  )
}
