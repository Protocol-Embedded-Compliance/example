// ai-agent/src/pec-types.ts

export type AiActClassification = 'minimal' | 'limited' | 'high' | 'unacceptable' | 'gpai' | 'gpai_systemic'

export type GdprTransferMechanism = 'ADEQUACY' | 'SCCS_2021' | 'BCR' | 'DEROGATION_CONSENT'

export type ControllerProcessorStatus = 'controller' | 'processor' | 'joint_controller'

export interface PecComplianceMetadata {
  pec_version: string
  processing_locations: string[]
  data_retention_days: number
  certifications: string[]
  ai_act_status: {
    classification: AiActClassification
    conformity_assessed: boolean
    notified_body?: string
  }
  gdpr: {
    controller_processor_status: ControllerProcessorStatus
    transfer_mechanisms: GdprTransferMechanism[]
    dpa_registered: boolean
    special_categories_processed: boolean
  }
  suitable_for: string[]
  unsuitable_for: string[]
  supply_chain_disclosure: boolean
  metadata_currency: {
    last_updated: string
    update_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
    next_scheduled_review?: string
  }
}

export interface DeploymentContext {
  governing_law: string
  jurisdiction: string
  data_residency: {
    required: string[]
    prohibited: string[]
  }
  gdpr_requirements: {
    transfer_mechanisms_required: GdprTransferMechanism[]
    special_categories_allowed: boolean
  }
  risk_classification: {
    maximum_permitted: AiActClassification
    human_escalation?: {
      required_above: AiActClassification
    }
  }
  sectors: {
    prohibited: string[]
  }
  certifications: {
    required_any: string[]
  }
  unknown_handling: {
    processing_locations: 'strict' | 'permissive' | 'escalate'
    certifications: 'strict' | 'permissive' | 'escalate'
    ai_act_status: 'strict' | 'permissive' | 'escalate'
  }
  legacy_servers: {
    policy: 'allow' | 'warn' | 'block'
    log_invocations: boolean
  }
}

export type AuditEventType =
  | 'tool_evaluation'
  | 'tool_approved'
  | 'tool_rejected'
  | 'tool_invocation'
  | 'tool_invocation_blocked'
  | 'compliance_warning'
  | 'agent_initialisation'

export interface AuditLogEntry {
  id: string
  timestamp: string
  event_type: AuditEventType
  tool_name: string | null
  deployment_context: {
    governing_law: string
    jurisdiction: string
    max_risk: AiActClassification
  }
  compliance_metadata: PecComplianceMetadata | null
  evaluation_result: {
    compliant: boolean
    reasons: string[]
    warnings: string[]
  } | null
  reasoning_trace: string[]
  session_id: string
}

export interface AuditLog {
  entries: AuditLogEntry[]
  session_id: string
  started_at: string
  deployment_context_hash: string
}
