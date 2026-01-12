// ai-agent/src/deployment-context.ts

import { DeploymentContext } from './pec-types'

export const euDeploymentContext: DeploymentContext = {
  governing_law: 'EU',
  jurisdiction: 'DE',
  data_residency: {
    required: ['EU', 'EEA', 'ADEQUACY'],
    prohibited: ['US', 'CN', 'RU']
  },
  gdpr_requirements: {
    transfer_mechanisms_required: ['ADEQUACY', 'SCCS_2021', 'BCR'],
    special_categories_allowed: false
  },
  risk_classification: {
    maximum_permitted: 'limited',
    human_escalation: {
      required_above: 'limited'
    }
  },
  sectors: {
    prohibited: ['healthcare_diagnosis', 'legal_advice', 'credit_scoring', 'biometric_identification']
  },
  certifications: {
    required_any: ['ISO_27001', 'SOC2_TYPE_II']
  },
  unknown_handling: {
    processing_locations: 'strict',
    certifications: 'permissive',
    ai_act_status: 'strict'
  },
  legacy_servers: {
    policy: 'block',
    log_invocations: true
  }
}

export const usHealthcareContext: DeploymentContext = {
  governing_law: 'US',
  jurisdiction: 'US-CA',
  data_residency: {
    required: ['US'],
    prohibited: ['CN', 'RU', 'IR', 'KP']
  },
  gdpr_requirements: {
    transfer_mechanisms_required: [],
    special_categories_allowed: true
  },
  risk_classification: {
    maximum_permitted: 'high',
    human_escalation: {
      required_above: 'limited'
    }
  },
  sectors: {
    prohibited: ['biometric_identification', 'emotion_recognition', 'social_scoring']
  },
  certifications: {
    required_any: ['HIPAA_COMPLIANT', 'SOC2_TYPE_II', 'HITRUST']
  },
  unknown_handling: {
    processing_locations: 'strict',
    certifications: 'strict',
    ai_act_status: 'permissive'
  },
  legacy_servers: {
    policy: 'warn',
    log_invocations: true
  }
}

export const financialServicesEuContext: DeploymentContext = {
  governing_law: 'EU',
  jurisdiction: 'FR',
  data_residency: {
    required: ['EU', 'EEA'],
    prohibited: ['US', 'CN', 'RU', 'IN']
  },
  gdpr_requirements: {
    transfer_mechanisms_required: ['ADEQUACY', 'BCR'],
    special_categories_allowed: false
  },
  risk_classification: {
    maximum_permitted: 'limited',
    human_escalation: {
      required_above: 'minimal'
    }
  },
  sectors: {
    prohibited: ['healthcare_diagnosis', 'biometric_identification', 'emotion_recognition', 'legal_advice']
  },
  certifications: {
    required_any: ['ISO_27001', 'SOC2_TYPE_II', 'PCI_DSS']
  },
  unknown_handling: {
    processing_locations: 'strict',
    certifications: 'strict',
    ai_act_status: 'strict'
  },
  legacy_servers: {
    policy: 'block',
    log_invocations: true
  }
}

export const allDeploymentContexts: Record<string, DeploymentContext> = {
  'eu-general': euDeploymentContext,
  'us-healthcare': usHealthcareContext,
  'eu-financial': financialServicesEuContext
}

export function getDeploymentContext(contextId: string): DeploymentContext {
  const context = allDeploymentContexts[contextId]
  if (!context) {
    throw new Error(`Unknown deployment context: ${contextId}. Available: ${Object.keys(allDeploymentContexts).join(', ')}`)
  }
  return context
}
