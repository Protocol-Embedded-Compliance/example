// ai-agent/src/compliance-filter.ts

import { PecComplianceMetadata, DeploymentContext, AiActClassification } from './pec-types'
import { getAuditLogger } from './audit-logger'

export interface ComplianceCheckResult {
  compliant: boolean
  reasons: string[]
  warnings: string[]
}

const EU_COUNTRIES = ['DE', 'FR', 'IE', 'NL', 'BE', 'AT', 'ES', 'IT', 'PT', 'PL', 'SE', 'DK', 'FI', 'CZ', 'RO', 'HU', 'BG', 'GR', 'SK', 'HR', 'SI', 'LT', 'LV', 'EE', 'CY', 'LU', 'MT']
const EEA_COUNTRIES = [...EU_COUNTRIES, 'NO', 'IS', 'LI']
const ADEQUACY_COUNTRIES = ['GB', 'CH', 'JP', 'KR', 'CA', 'NZ', 'IL', 'AR', 'UY']

const RISK_LEVELS: Record<AiActClassification, number> = {
  'minimal': 1,
  'limited': 2,
  'gpai': 3,
  'high': 4,
  'gpai_systemic': 5,
  'unacceptable': 6
}

function expandJurisdiction(code: string): string[] {
  const upperCode = code.toUpperCase()
  if (upperCode === 'EU') return EU_COUNTRIES
  if (upperCode === 'EEA') return EEA_COUNTRIES
  if (upperCode === 'ADEQUACY') return [...EEA_COUNTRIES, ...ADEQUACY_COUNTRIES]
  return [upperCode]
}

function isLocationAllowed(
  location: string,
  required: string[],
  prohibited: string[]
): boolean {
  const allowedLocations = new Set<string>()
  required.forEach(req => {
    expandJurisdiction(req).forEach(loc => allowedLocations.add(loc))
  })

  const blockedLocations = new Set<string>()
  prohibited.forEach(pro => {
    expandJurisdiction(pro).forEach(loc => blockedLocations.add(loc))
  })

  const upperLocation = location.toUpperCase()

  if (blockedLocations.has(upperLocation)) {
    return false
  }

  return allowedLocations.has(upperLocation)
}

function checkTransferMechanisms(
  toolMechanisms: string[],
  requiredMechanisms: string[] | undefined
): { valid: boolean; reason?: string } {
  if (!requiredMechanisms || requiredMechanisms.length === 0) {
    return { valid: true }
  }

  if (toolMechanisms.length === 0) {
    return {
      valid: false,
      reason: `Tool declares no GDPR transfer mechanisms but context requires one of: ${requiredMechanisms.join(', ')}`
    }
  }

  const hasRequiredMechanism = toolMechanisms.some(
    mechanism => requiredMechanisms.includes(mechanism)
  )

  if (!hasRequiredMechanism) {
    return {
      valid: false,
      reason: `Tool transfer mechanisms [${toolMechanisms.join(', ')}] do not include any required mechanism: ${requiredMechanisms.join(', ')}`
    }
  }

  return { valid: true }
}

function checkSpecialCategories(
  toolProcessesSpecialCategories: boolean,
  contextAllowsSpecialCategories: boolean | undefined
): { valid: boolean; reason?: string } {
  if (contextAllowsSpecialCategories === undefined) {
    return { valid: true }
  }

  if (toolProcessesSpecialCategories && !contextAllowsSpecialCategories) {
    return {
      valid: false,
      reason: 'Tool processes GDPR special categories (Art 9) but deployment context prohibits this'
    }
  }

  return { valid: true }
}

export function checkCompliance(
  toolName: string,
  compliance: PecComplianceMetadata | undefined,
  context: DeploymentContext
): ComplianceCheckResult {
  const result: ComplianceCheckResult = {
    compliant: true,
    reasons: [],
    warnings: []
  }

  if (!compliance) {
    if (context.legacy_servers.policy === 'block') {
      result.compliant = false
      result.reasons.push('Tool lacks PEC compliance metadata and legacy servers are blocked')
    } else if (context.legacy_servers.policy === 'warn') {
      result.warnings.push('Tool lacks PEC compliance metadata (legacy server)')
    }
    return result
  }

  if (!compliance.pec_version) {
    if (context.legacy_servers.policy === 'block') {
      result.compliant = false
      result.reasons.push('Tool does not declare PEC version')
    }
    return result
  }

  for (const location of compliance.processing_locations) {
    if (!isLocationAllowed(location, context.data_residency.required, context.data_residency.prohibited)) {
      result.compliant = false
      result.reasons.push(`Processing location '${location}' is not allowed under deployment context`)
    }
  }

  const maxPermittedLevel = RISK_LEVELS[context.risk_classification.maximum_permitted]
  const toolRiskLevel = RISK_LEVELS[compliance.ai_act_status.classification]

  if (toolRiskLevel > maxPermittedLevel) {
    result.compliant = false
    result.reasons.push(
      `Tool risk classification '${compliance.ai_act_status.classification}' exceeds maximum permitted '${context.risk_classification.maximum_permitted}'`
    )
  }

  if (!compliance.ai_act_status.conformity_assessed) {
    if (context.unknown_handling.ai_act_status === 'strict') {
      result.compliant = false
      result.reasons.push('Tool has not undergone conformity assessment')
    } else {
      result.warnings.push('Tool has not undergone conformity assessment')
    }
  }

  if (context.gdpr_requirements) {
    const transferCheck = checkTransferMechanisms(
      compliance.gdpr.transfer_mechanisms,
      context.gdpr_requirements.transfer_mechanisms_required
    )
    if (!transferCheck.valid && transferCheck.reason) {
      result.compliant = false
      result.reasons.push(transferCheck.reason)
    }

    const specialCatCheck = checkSpecialCategories(
      compliance.gdpr.special_categories_processed,
      context.gdpr_requirements.special_categories_allowed
    )
    if (!specialCatCheck.valid && specialCatCheck.reason) {
      result.compliant = false
      result.reasons.push(specialCatCheck.reason)
    }
  }

  for (const prohibited of context.sectors.prohibited) {
    if (compliance.suitable_for.includes(prohibited)) {
      result.compliant = false
      result.reasons.push(`Tool is suitable for prohibited sector: '${prohibited}'`)
    }
  }

  const hasCertification = context.certifications.required_any.some(
    cert => compliance.certifications.includes(cert)
  )

  if (!hasCertification && context.certifications.required_any.length > 0) {
    if (context.unknown_handling.certifications === 'strict') {
      result.compliant = false
      result.reasons.push(
        `Tool lacks required certifications. Required one of: ${context.certifications.required_any.join(', ')}`
      )
    } else {
      result.warnings.push(
        `Tool lacks preferred certifications: ${context.certifications.required_any.join(', ')}`
      )
    }
  }

  if (!compliance.supply_chain_disclosure) {
    result.warnings.push('Tool has not disclosed supply chain dependencies')
  }

  const auditLogger = getAuditLogger()
  if (auditLogger) {
    auditLogger.logToolEvaluation(toolName, compliance, result)

    if (result.compliant && result.warnings.length > 0) {
      auditLogger.logComplianceWarning(toolName, compliance, result.warnings)
    }
  }

  return result
}

export function filterCompliantTools<T extends { name: string; compliance?: PecComplianceMetadata }>(
  tools: T[],
  context: DeploymentContext
): { compliant: T[]; rejected: Array<{ tool: T; result: ComplianceCheckResult }> } {
  const compliant: T[] = []
  const rejected: Array<{ tool: T; result: ComplianceCheckResult }> = []

  for (const tool of tools) {
    const result = checkCompliance(tool.name, tool.compliance, context)

    if (result.compliant) {
      compliant.push(tool)
      if (result.warnings.length > 0) {
        console.log(`[PEC] Tool '${tool.name}' approved with warnings:`, result.warnings)
      }
    } else {
      rejected.push({ tool, result })
      console.log(`[PEC] Tool '${tool.name}' REJECTED:`, result.reasons)
    }
  }

  return { compliant, rejected }
}
