# PEC Example: Protocol-Embedded Compliance with Mastra

A working demonstration of **Protocol-Embedded Compliance (PEC)** using the [Mastra](https://mastra.ai) AI agent framework.

## What is PEC?

Protocol-Embedded Compliance embeds regulatory requirements into AI agent-tool interactions. Instead of relying on ex-post enforcement, PEC enables:

1. **Tools** to declare compliance metadata (processing locations, certifications, AI Act classification)
2. **Deployers** to specify compliance constraints (required jurisdictions, maximum risk levels)
3. **Agents** to filter available tools based on constraints before invocation

This example demonstrates PEC for EU AI Act compliance.

## Quick Start

```bash
# Clone and enter directory
cd pec-example

# Install dependencies
pnpm install

# Run the demo
pnpm start
```

## What the Demo Shows

The demo connects to:
- **6 mock third-party MCP servers** (in-memory) representing vendors from different jurisdictions
- **1 real MCP server via stdio** with dynamically discovered tools

All tools are filtered using the **same PEC schema and filtering logic**.

### EU General Context Results

| Server/Tool | Location | Risk | Result |
|-------------|----------|------|--------|
| Acme Translation (Dublin) | IE, FR | minimal | ✓ Compliant |
| GlobalPay (San Francisco) | US, SG | limited | ✗ Rejected |
| SwissVault (Zurich) | CH | limited | ✓ Compliant |
| Tokyo AI Labs (Tokyo) | JP | limited | ✓ Compliant |
| Beijing Cloud (Beijing) | CN | limited | ✗ Rejected |
| MedixUS (Boston) | US | high | ✗ Rejected |
| Real MCP: document_summariser | DE, IE | limited | ✓ Compliant |
| Real MCP: text_formatter | NL | minimal | ✓ Compliant |
| Real MCP: data_exporter | US, CN | high | ✗ Rejected |
| Real MCP: healthcare_analyser | US | high | ✗ Rejected |

### US Healthcare Context Results

Different deployment context, different filtering results — same PEC schema.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Agent (Mastra)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   Deployment Context                          │  │
│  │  - governing_law: EU                                          │  │
│  │  - max_risk: limited                                          │  │
│  │  - required_locations: [EU, EEA, ADEQUACY]                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               │                                      │
│           ┌───────────────────┴───────────────────┐                  │
│           ▼                                       ▼                  │
│  ┌─────────────────────┐              ┌─────────────────────────┐   │
│  │  Mock MCP Servers   │              │   Real MCP Server       │   │
│  │  (in-memory)        │              │   (via stdio)           │   │
│  │                     │              │                         │   │
│  │  • Acme (IE, FR)    │              │  Spawned as subprocess  │   │
│  │  • GlobalPay (US)   │              │  Tools discovered via   │   │
│  │  • SwissVault (CH)  │              │  MCP protocol           │   │
│  │  • Tokyo AI (JP)    │              │                         │   │
│  │  • Beijing (CN)     │              │  PEC metadata parsed    │   │
│  │  • MedixUS (US)     │              │  from tool descriptions │   │
│  └─────────────────────┘              └─────────────────────────┘   │
│           │                                       │                  │
│           └───────────────────┬───────────────────┘                  │
│                               ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  Compliance Filter (PEC)                      │  │
│  │                                                               │  │
│  │  Same filtering logic for ALL tools regardless of source     │  │
│  │  ✓ Pass: Locations match, risk acceptable, certs present     │  │
│  │  ✗ Fail: Prohibited location, excessive risk, missing certs  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
pec-example/
├── mcp-server/              # Real MCP Server with PEC compliance metadata
│   └── src/
│       ├── index.ts         # MCP server (stdio transport)
│       ├── tools.ts         # Tool definitions + PEC metadata
│       └── pec-types.ts     # TypeScript types
├── ai-agent/                # Mastra AI Agent
│   └── src/
│       ├── index.ts               # Demo entry point
│       ├── mcp-client.ts          # MCP client + PEC metadata parser
│       ├── compliance-filter.ts   # PEC filtering logic
│       ├── deployment-context.ts  # EU/US deployment contexts
│       ├── third-party-servers.ts # Mock third-party servers
│       └── pec-types.ts           # PEC schema types
├── AGENTS.md                # Instructions for AI coding agents
└── README.md                # This file
```

## Key Concepts

### PEC Compliance Metadata

Each tool declares its compliance characteristics:

```json
{
  "pec_version": "1.0",
  "processing_locations": ["DE", "IE"],
  "ai_act_status": {
    "classification": "limited",
    "conformity_assessed": true
  },
  "gdpr": {
    "controller_processor_status": "processor",
    "transfer_mechanisms": ["ADEQUACY"],
    "special_categories_processed": false
  },
  "certifications": ["ISO_27001", "SOC2_TYPE_II"],
  "suitable_for": ["summarisation", "research"],
  "unsuitable_for": ["healthcare_diagnosis"]
}
```

### Deployment Context

Deployers specify constraints that tools must meet:

```typescript
{
  governing_law: 'EU',
  jurisdiction: 'DE',
  data_residency: {
    required: ['EU', 'EEA', 'ADEQUACY'],
    prohibited: ['US', 'CN', 'RU']
  },
  risk_classification: {
    maximum_permitted: 'limited'
  },
  gdpr_requirements: {
    transfer_mechanisms_required: ['ADEQUACY', 'SCCS_2021', 'BCR'],
    special_categories_allowed: false
  }
}
```

### How PEC Metadata is Embedded in MCP

The MCP server embeds PEC metadata in tool descriptions:

```typescript
const description = `Summarises documents into concise overviews.

[PEC_COMPLIANCE:{"pec_version":"1.0","processing_locations":["DE","IE"],...}]`
```

The AI agent's MCP client parses this metadata when discovering tools.

## The Value of Standardisation

| Without PEC | With PEC |
|-------------|----------|
| Custom integration code for each MCP server | One schema, one filter |
| Manual compliance review per tool | Automated filtering |
| Inconsistent metadata formats | Standardised declarations |
| Difficult to audit | Structured audit logs |

## Learn More

- [PEC Website](https://usepec.eu) - Protocol-Embedded Compliance overview and schema
- [Mastra Docs](https://mastra.ai/docs) - Mastra framework documentation
- [MCP Specification](https://modelcontextprotocol.io/) - Model Context Protocol
- [EU AI Act](https://artificialintelligenceact.eu/) - Official EU AI Act resources

## Licence

MIT
