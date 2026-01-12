// mcp-server/src/tools.ts

import { PecTool, PecComplianceMetadata } from './pec-types'

const complianceMetadataEuCompliant1: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['DE', 'IE'],
  data_retention_days: 90,
  certifications: ['ISO_27001', 'SOC2_TYPE_II'],
  ai_act_status: {
    classification: 'limited',
    conformity_assessed: true,
    notified_body: 'TÜV_SÜD'
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['research', 'summarisation', 'translation', 'data_analysis'],
  unsuitable_for: ['healthcare_diagnosis', 'legal_advice', 'credit_scoring'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-12T00:00:00Z',
    update_frequency: 'monthly',
    next_scheduled_review: '2026-02-12T00:00:00Z'
  }
}

const complianceMetadataEuCompliant2: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['NL'],
  data_retention_days: 30,
  certifications: ['ISO_27001'],
  ai_act_status: {
    classification: 'minimal',
    conformity_assessed: true
  },
  gdpr: {
    controller_processor_status: 'processor',
    transfer_mechanisms: ['ADEQUACY'],
    dpa_registered: true,
    special_categories_processed: false
  },
  suitable_for: ['text_processing', 'formatting', 'spell_check'],
  unsuitable_for: ['biometric_identification', 'emotion_recognition'],
  supply_chain_disclosure: true,
  metadata_currency: {
    last_updated: '2026-01-10T00:00:00Z',
    update_frequency: 'weekly'
  }
}

const complianceMetadataNonCompliant: PecComplianceMetadata = {
  pec_version: '1.0',
  processing_locations: ['US', 'CN'],
  data_retention_days: 365,
  certifications: [],
  ai_act_status: {
    classification: 'high',
    conformity_assessed: false
  },
  gdpr: {
    controller_processor_status: 'controller',
    transfer_mechanisms: [],
    dpa_registered: false,
    special_categories_processed: false
  },
  suitable_for: ['internal_testing'],
  unsuitable_for: ['eu_personal_data', 'gdpr_scope', 'production'],
  supply_chain_disclosure: false,
  metadata_currency: {
    last_updated: '2025-06-01T00:00:00Z',
    update_frequency: 'monthly'
  }
}

const complianceMetadataUsHealthcare: PecComplianceMetadata = {
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

export const documentSummariser: PecTool = {
  name: 'document_summariser',
  description: 'Summarises documents into concise overviews. EU AI Act compliant (limited risk, conformity assessed). Processes data in Germany and Ireland.',
  compliance: complianceMetadataEuCompliant1,
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to summarise' }
    },
    required: ['text']
  },
  execute: async (params: Record<string, unknown>) => {
    const text = params.text as string
    if (!text) {
      return { error: 'No text provided for summarisation' }
    }
    const wordCount = text.split(/\s+/).length
    const summary = `Summary: This document contains ${wordCount} words. Key themes have been identified and condensed.`
    return {
      success: true,
      summary,
      original_length: wordCount,
      summary_length: summary.split(/\s+/).length
    }
  }
}

export const textFormatter: PecTool = {
  name: 'text_formatter',
  description: 'Formats and cleans text input. EU AI Act compliant (minimal risk, conformity assessed). Processes data in the Netherlands.',
  compliance: complianceMetadataEuCompliant2,
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to format' },
      format: {
        type: 'string',
        enum: ['uppercase', 'lowercase', 'titlecase', 'clean'],
        description: 'The format to apply'
      }
    },
    required: ['text']
  },
  execute: async (params: Record<string, unknown>) => {
    const text = params.text as string
    const format = params.format as string || 'clean'

    if (!text) {
      return { error: 'No text provided for formatting' }
    }

    let result = text
    switch (format) {
      case 'uppercase':
        result = text.toUpperCase()
        break
      case 'lowercase':
        result = text.toLowerCase()
        break
      case 'titlecase':
        result = text.replace(/\w\S*/g, txt =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        )
        break
      case 'clean':
      default:
        result = text.trim().replace(/\s+/g, ' ')
    }

    return {
      success: true,
      formatted_text: result,
      format_applied: format
    }
  }
}

export const dataExporter: PecTool = {
  name: 'data_exporter',
  description: 'Exports data to external storage. NOT EU AI Act compliant - processes data in US and China without conformity assessment. Use for internal testing only.',
  compliance: complianceMetadataNonCompliant,
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'The data to export' }
    },
    required: ['data']
  },
  execute: async (params: Record<string, unknown>) => {
    const data = params.data
    if (!data) {
      return { error: 'No data provided for export' }
    }
    return {
      success: true,
      message: 'Data exported successfully',
      destination: 'external_storage',
      warning: 'This tool is NOT compliant with EU AI Act requirements'
    }
  }
}

export const healthcareAnalyser: PecTool = {
  name: 'healthcare_analyser',
  description: 'Analyses healthcare records for US-based healthcare deployments. HIPAA compliant. Processes PHI in US data centres.',
  compliance: complianceMetadataUsHealthcare,
  inputSchema: {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: { type: 'string' },
        description: 'Medical record identifiers to analyse'
      },
      analysis_type: {
        type: 'string',
        enum: ['summary', 'trends', 'alerts'],
        description: 'Type of analysis to perform'
      }
    },
    required: ['records', 'analysis_type']
  },
  execute: async (params: Record<string, unknown>) => {
    const records = params.records as string[]
    const analysisType = params.analysis_type as string

    if (!records || records.length === 0) {
      return { error: 'No records provided for analysis' }
    }

    return {
      success: true,
      analysis: `Performed ${analysisType} analysis on ${records.length} records`,
      record_count: records.length,
      phi_processed: true
    }
  }
}

export const allTools: PecTool[] = [
  documentSummariser,
  textFormatter,
  dataExporter,
  healthcareAnalyser
]
