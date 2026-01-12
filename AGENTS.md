# AGENTS.md

> Guide for AI coding agents working on the PEC (Protocol-Embedded Compliance) example project.

This project demonstrates Protocol-Embedded Compliance as described in the paper "Protocol-Embedded Compliance: A Framework for Regulation-Following AI Agents" by Lloyd Jones.

## Project Overview

A working demonstration of PEC — a standardised schema for compliance metadata that enables agents to filter tools from any MCP server using the same logic.

**What PEC is:** A declarative JSON schema. Servers declare compliance characteristics, agents filter based on deployment constraints.

**What this demo shows:**
- 6 mock third-party MCP servers (in-memory) from different vendors/jurisdictions
- 1 real MCP server connected via stdio with dynamically discovered tools
- All using the same PEC schema, filtered by one implementation

## Key Concepts

### PEC Compliance Metadata

Each tool exposes compliance metadata following the PEC schema:

```typescript
interface PecComplianceMetadata {
  pec_version: string
  processing_locations: string[]        // ISO 3166-1 codes
  data_retention_days: number
  certifications: string[]              // ISO_27001, SOC2_TYPE_II, HIPAA_COMPLIANT, etc.
  ai_act_status: {
    classification: 'minimal' | 'limited' | 'high' | 'unacceptable' | 'gpai' | 'gpai_systemic'
    conformity_assessed: boolean
    notified_body?: string
  }
  gdpr: {
    controller_processor_status: 'controller' | 'processor' | 'joint_controller'
    transfer_mechanisms: ('ADEQUACY' | 'SCCS_2021' | 'BCR' | 'DEROGATION_CONSENT')[]
    dpa_registered: boolean
    special_categories_processed: boolean
  }
  suitable_for: string[]
  unsuitable_for: string[]
  supply_chain_disclosure: boolean
  metadata_currency: {
    last_updated: string
    update_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly'
  }
}
```

### Deployment Context

Agents are configured with a deployment context that specifies compliance constraints:

```typescript
interface DeploymentContext {
  governing_law: string                 // 'EU', 'US'
  jurisdiction: string                  // ISO code, e.g., 'DE', 'US-CA'
  data_residency: {
    required: string[]                  // ['EU', 'EEA', 'ADEQUACY']
    prohibited: string[]                // ['US', 'CN', 'RU']
  }
  gdpr_requirements: {
    transfer_mechanisms_required: GdprTransferMechanism[]
    special_categories_allowed: boolean
  }
  risk_classification: {
    maximum_permitted: AiActClassification
  }
  sectors: {
    prohibited: string[]
  }
  certifications: {
    required_any: string[]
  }
}
```

### How PEC Metadata is Embedded in MCP

The MCP server embeds PEC metadata in tool descriptions using a suffix format:

```typescript
const description = `Tool description here.

[PEC_COMPLIANCE:{"pec_version":"1.0","processing_locations":["DE","IE"],...}]`
```

The AI agent's MCP client parses this suffix when discovering tools via the MCP protocol.

## Running the Demo

```bash
# Install dependencies
pnpm install

# Run the demo
pnpm start
```

**Output:** Connects to real MCP server via stdio, discovers tools, then filters all tools (mock + real) against EU and US Healthcare contexts.

## Directory Structure

```
pec-example/
├── AGENTS.md                    # This file
├── README.md                    # User documentation
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # PNPM workspace definition
├── audit-log-*.json             # Generated audit logs
├── mcp-server/                  # Real MCP Server with PEC metadata
│   ├── src/
│   │   ├── index.ts            # Server entry point (stdio transport)
│   │   ├── tools.ts            # Tool definitions with PEC metadata
│   │   └── pec-types.ts        # PEC type definitions
│   └── package.json
└── ai-agent/                    # Demo: filtering tools from multiple servers
    ├── src/
    │   ├── index.ts            # Demo entry point
    │   ├── mcp-client.ts       # MCP client + PEC metadata parser
    │   ├── pec-types.ts        # PEC type definitions
    │   ├── deployment-context.ts # Example deployment contexts
    │   ├── compliance-filter.ts # PEC compliance filtering logic
    │   ├── third-party-servers.ts # Mock third-party MCP servers
    │   └── audit-logger.ts     # Structured audit logging
    └── package.json
```

## Code Style

- **Language**: TypeScript (strict mode)
- **Module System**: ESM (`"type": "module"`)
- **Package Manager**: PNPM with workspaces
- **Runtime**: TypeScript executed directly via `tsx`

## Key Files

| File | Purpose |
|------|---------|
| `ai-agent/src/index.ts` | Demo entry point, orchestrates mock + real MCP filtering |
| `ai-agent/src/mcp-client.ts` | Connects to MCP server via stdio, parses PEC metadata from descriptions |
| `ai-agent/src/pec-types.ts` | PEC schema definitions |
| `ai-agent/src/deployment-context.ts` | Example deployment contexts (EU, US Healthcare) |
| `ai-agent/src/compliance-filter.ts` | Filtering logic (location, risk, GDPR checks) |
| `ai-agent/src/third-party-servers.ts` | Mock servers showing interoperability |
| `mcp-server/src/index.ts` | Real MCP server exposing tools with PEC metadata |
| `mcp-server/src/tools.ts` | How to declare PEC metadata on MCP tools |

## The Value of Standardisation

The demo shows tools from different sources:

### Mock Third-Party Servers (6)

| Server | Vendor | Location | EU Result | US Healthcare Result |
|--------|--------|----------|-----------|----------------------|
| acme-translation-server | Acme (Dublin) | IE, FR | ✓ Compliant | ✗ Rejected |
| globalpay-mcp-server | GlobalPay (SF) | US, SG | ✗ Rejected | ✗ Rejected |
| swissvault-mcp-server | SwissVault (Zurich) | CH | ✓ Compliant | ✗ Rejected |
| tokyoai-mcp-server | Tokyo AI Labs | JP | ✓ Compliant | ✗ Rejected |
| beijingcloud-mcp-server | Beijing Cloud | CN | ✗ Rejected | ✗ Rejected |
| medixus-mcp-server | MedixUS (Boston) | US | ✗ Rejected | ✓ Compliant |

### Real MCP Server (4 tools via stdio)

| Tool | Location | EU Result | US Healthcare Result |
|------|----------|-----------|----------------------|
| document_summariser | DE, IE | ✓ Compliant | ✗ Rejected |
| text_formatter | NL | ✓ Compliant | ✗ Rejected |
| data_exporter | US, CN | ✗ Rejected | ✗ Rejected |
| healthcare_analyser | US | ✗ Rejected | ✓ Compliant |

**Without PEC:** Custom integration code for each server.
**With PEC:** One schema, one filter, works everywhere.

## References

- [Protocol-Embedded Compliance Website](https://usepec.eu)
- [Mastra Documentation](https://mastra.ai/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689)
