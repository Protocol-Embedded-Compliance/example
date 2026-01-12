// mcp-server/src/pec-types.ts

export type AiActClassification = 'minimal' | 'limited' | 'high' | 'unacceptable' | 'gpai' | 'gpai_systemic'

export type GdprTransferMechanism = 'ADEQUACY' | 'SCCS_2021' | 'BCR' | 'DEROGATION_CONSENT'

export type ControllerProcessorStatus = 'controller' | 'processor' | 'joint_controller'

export interface AiActStatus {
  classification: AiActClassification
  conformity_assessed: boolean
  notified_body?: string
}

export interface GdprStatus {
  controller_processor_status: ControllerProcessorStatus
  transfer_mechanisms: GdprTransferMechanism[]
  dpa_registered: boolean
  special_categories_processed: boolean
}

export interface MetadataCurrency {
  last_updated: string
  update_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
  next_scheduled_review?: string
}

export interface PecComplianceMetadata {
  pec_version: string
  processing_locations: string[]
  data_retention_days: number
  certifications: string[]
  ai_act_status: AiActStatus
  gdpr: GdprStatus
  suitable_for: string[]
  unsuitable_for: string[]
  supply_chain_disclosure: boolean
  metadata_currency: MetadataCurrency
}

export interface PecTool {
  name: string
  description: string
  compliance: PecComplianceMetadata
  inputSchema?: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export function isEuAiActCompliant(compliance: PecComplianceMetadata): boolean {
  const allowedClassifications: AiActClassification[] = ['minimal', 'limited', 'gpai']
  return (
    allowedClassifications.includes(compliance.ai_act_status.classification) &&
    compliance.ai_act_status.conformity_assessed
  )
}

export function hasAdequateDataProtection(compliance: PecComplianceMetadata): boolean {
  const euCountries = ['DE', 'FR', 'IE', 'NL', 'BE', 'AT', 'ES', 'IT', 'PT', 'PL']
  const adequacyCountries = ['GB', 'CH', 'JP', 'KR', 'CA', 'NZ', 'IL', 'AR', 'UY']
  const allowedLocations = [...euCountries, ...adequacyCountries, 'EU', 'EEA', 'ADEQUACY']

  return compliance.processing_locations.every(loc =>
    allowedLocations.includes(loc.toUpperCase())
  )
}
