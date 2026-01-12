// ai-agent/src/audit-logger.ts

import { createHash, randomUUID } from 'crypto'
import {
  AuditLog,
  AuditLogEntry,
  AuditEventType,
  PecComplianceMetadata,
  DeploymentContext,
  AiActClassification
} from './pec-types'

export class PecAuditLogger {
  private log: AuditLog
  private context: DeploymentContext

  constructor(context: DeploymentContext) {
    this.context = context
    const sessionId = randomUUID()
    this.log = {
      entries: [],
      session_id: sessionId,
      started_at: new Date().toISOString(),
      deployment_context_hash: this.hashContext(context)
    }
  }

  private hashContext(context: DeploymentContext): string {
    const contextString = JSON.stringify(context)
    return createHash('sha256').update(contextString).digest('hex').substring(0, 16)
  }

  private createEntry(
    eventType: AuditEventType,
    toolName: string | null,
    compliance: PecComplianceMetadata | null,
    evaluationResult: { compliant: boolean; reasons: string[]; warnings: string[] } | null,
    reasoningTrace: string[]
  ): AuditLogEntry {
    return {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      event_type: eventType,
      tool_name: toolName,
      deployment_context: {
        governing_law: this.context.governing_law,
        jurisdiction: this.context.jurisdiction,
        max_risk: this.context.risk_classification.maximum_permitted
      },
      compliance_metadata: compliance,
      evaluation_result: evaluationResult,
      reasoning_trace: reasoningTrace,
      session_id: this.log.session_id
    }
  }

  logAgentInitialisation(compliantCount: number, rejectedCount: number): void {
    const entry = this.createEntry(
      'agent_initialisation',
      null,
      null,
      null,
      [
        `Agent initialised with deployment context: ${this.context.governing_law}/${this.context.jurisdiction}`,
        `Maximum permitted risk: ${this.context.risk_classification.maximum_permitted}`,
        `Data residency required: ${this.context.data_residency.required.join(', ')}`,
        `Data residency prohibited: ${this.context.data_residency.prohibited.join(', ')}`,
        `Tools evaluated: ${compliantCount + rejectedCount}`,
        `Tools approved: ${compliantCount}`,
        `Tools rejected: ${rejectedCount}`
      ]
    )
    this.log.entries.push(entry)
  }

  logToolEvaluation(
    toolName: string,
    compliance: PecComplianceMetadata,
    result: { compliant: boolean; reasons: string[]; warnings: string[] }
  ): void {
    const reasoningTrace = this.buildEvaluationTrace(toolName, compliance, result)
    const eventType: AuditEventType = result.compliant ? 'tool_approved' : 'tool_rejected'

    const entry = this.createEntry(
      eventType,
      toolName,
      compliance,
      result,
      reasoningTrace
    )
    this.log.entries.push(entry)
  }

  logToolInvocation(
    toolName: string,
    compliance: PecComplianceMetadata,
    inputSummary: string
  ): void {
    const entry = this.createEntry(
      'tool_invocation',
      toolName,
      compliance,
      { compliant: true, reasons: [], warnings: [] },
      [
        `Tool invoked: ${toolName}`,
        `Input summary: ${inputSummary}`,
        `Processing locations: ${compliance.processing_locations.join(', ')}`,
        `Risk classification: ${compliance.ai_act_status.classification}`
      ]
    )
    this.log.entries.push(entry)
  }

  logToolInvocationBlocked(
    toolName: string,
    reason: string
  ): void {
    const entry = this.createEntry(
      'tool_invocation_blocked',
      toolName,
      null,
      { compliant: false, reasons: [reason], warnings: [] },
      [
        `Tool invocation blocked: ${toolName}`,
        `Reason: ${reason}`,
        `Action: Request denied to maintain compliance`
      ]
    )
    this.log.entries.push(entry)
  }

  logComplianceWarning(
    toolName: string,
    compliance: PecComplianceMetadata,
    warnings: string[]
  ): void {
    const entry = this.createEntry(
      'compliance_warning',
      toolName,
      compliance,
      { compliant: true, reasons: [], warnings },
      [
        `Compliance warnings for tool: ${toolName}`,
        ...warnings.map(w => `Warning: ${w}`)
      ]
    )
    this.log.entries.push(entry)
  }

  private buildEvaluationTrace(
    toolName: string,
    compliance: PecComplianceMetadata,
    result: { compliant: boolean; reasons: string[]; warnings: string[] }
  ): string[] {
    const trace: string[] = [
      `Evaluating tool: ${toolName}`,
      `PEC version: ${compliance.pec_version}`,
      ``,
      `--- Location Check ---`,
      `Tool processing locations: ${compliance.processing_locations.join(', ')}`,
      `Context required locations: ${this.context.data_residency.required.join(', ')}`,
      `Context prohibited locations: ${this.context.data_residency.prohibited.join(', ')}`
    ]

    const locationViolations = result.reasons.filter(r => r.includes('Processing location'))
    if (locationViolations.length > 0) {
      trace.push(`FAIL: ${locationViolations.join('; ')}`)
    } else {
      trace.push(`PASS: All processing locations acceptable`)
    }

    trace.push(
      ``,
      `--- Risk Classification Check ---`,
      `Tool classification: ${compliance.ai_act_status.classification}`,
      `Maximum permitted: ${this.context.risk_classification.maximum_permitted}`
    )

    const riskViolations = result.reasons.filter(r => r.includes('risk classification'))
    if (riskViolations.length > 0) {
      trace.push(`FAIL: ${riskViolations.join('; ')}`)
    } else {
      trace.push(`PASS: Risk classification within limits`)
    }

    trace.push(
      ``,
      `--- Conformity Assessment Check ---`,
      `Conformity assessed: ${compliance.ai_act_status.conformity_assessed}`,
      `Notified body: ${compliance.ai_act_status.notified_body || 'None'}`
    )

    const conformityViolations = result.reasons.filter(r => r.includes('conformity assessment'))
    if (conformityViolations.length > 0) {
      trace.push(`FAIL: ${conformityViolations.join('; ')}`)
    } else if (!compliance.ai_act_status.conformity_assessed) {
      trace.push(`WARNING: Tool has not undergone conformity assessment`)
    } else {
      trace.push(`PASS: Conformity assessment complete`)
    }

    trace.push(
      ``,
      `--- GDPR Transfer Mechanism Check ---`,
      `Tool transfer mechanisms: ${compliance.gdpr.transfer_mechanisms.join(', ') || 'None'}`,
      `Context required mechanisms: ${this.context.gdpr_requirements?.transfer_mechanisms_required?.join(', ') || 'None specified'}`
    )

    const transferViolations = result.reasons.filter(r => r.includes('transfer mechanism'))
    if (transferViolations.length > 0) {
      trace.push(`FAIL: ${transferViolations.join('; ')}`)
    } else {
      trace.push(`PASS: Transfer mechanisms acceptable`)
    }

    trace.push(
      ``,
      `--- Special Categories Check ---`,
      `Tool processes special categories: ${compliance.gdpr.special_categories_processed}`,
      `Context allows special categories: ${this.context.gdpr_requirements?.special_categories_allowed ?? 'Not specified'}`
    )

    const specialCatViolations = result.reasons.filter(r => r.includes('special categories'))
    if (specialCatViolations.length > 0) {
      trace.push(`FAIL: ${specialCatViolations.join('; ')}`)
    } else {
      trace.push(`PASS: Special categories handling acceptable`)
    }

    trace.push(
      ``,
      `--- Certification Check ---`,
      `Tool certifications: ${compliance.certifications.join(', ') || 'None'}`,
      `Context required (any): ${this.context.certifications.required_any.join(', ')}`
    )

    const certViolations = result.reasons.filter(r => r.includes('certification'))
    if (certViolations.length > 0) {
      trace.push(`FAIL: ${certViolations.join('; ')}`)
    } else {
      trace.push(`PASS: Certification requirements met`)
    }

    trace.push(
      ``,
      `--- Sector Check ---`,
      `Tool suitable for: ${compliance.suitable_for.join(', ')}`,
      `Context prohibited sectors: ${this.context.sectors.prohibited.join(', ')}`
    )

    const sectorViolations = result.reasons.filter(r => r.includes('prohibited sector'))
    if (sectorViolations.length > 0) {
      trace.push(`FAIL: ${sectorViolations.join('; ')}`)
    } else {
      trace.push(`PASS: No prohibited sector conflicts`)
    }

    trace.push(
      ``,
      `--- Final Decision ---`,
      `Compliant: ${result.compliant}`,
      `Rejection reasons: ${result.reasons.length > 0 ? result.reasons.join('; ') : 'None'}`,
      `Warnings: ${result.warnings.length > 0 ? result.warnings.join('; ') : 'None'}`
    )

    return trace
  }

  getLog(): AuditLog {
    return { ...this.log }
  }

  getEntries(): AuditLogEntry[] {
    return [...this.log.entries]
  }

  getEntriesByType(eventType: AuditEventType): AuditLogEntry[] {
    return this.log.entries.filter(e => e.event_type === eventType)
  }

  getEntriesByTool(toolName: string): AuditLogEntry[] {
    return this.log.entries.filter(e => e.tool_name === toolName)
  }

  exportAsJson(): string {
    return JSON.stringify(this.log, null, 2)
  }

  printSummary(): void {
    console.log('\n=== PEC Audit Log Summary ===')
    console.log(`Session ID: ${this.log.session_id}`)
    console.log(`Started: ${this.log.started_at}`)
    console.log(`Context Hash: ${this.log.deployment_context_hash}`)
    console.log(`Total Entries: ${this.log.entries.length}`)

    const byType: Record<string, number> = {}
    this.log.entries.forEach(e => {
      byType[e.event_type] = (byType[e.event_type] || 0) + 1
    })

    console.log('\nEvents by type:')
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
  }
}

let globalAuditLogger: PecAuditLogger | null = null

export function initAuditLogger(context: DeploymentContext): PecAuditLogger {
  globalAuditLogger = new PecAuditLogger(context)
  return globalAuditLogger
}

export function getAuditLogger(): PecAuditLogger | null {
  return globalAuditLogger
}
