# KASKU AI — Agentic Module Store & Multi-Agent Engine (v2.0)

[![Production Readiness](https://img.shields.io/badge/Production_Readiness-98%25_Hardened-brightgreen.svg)](docs/architecture/ARCHITECTURE.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**KASKU AI** is an enterprise-grade, production-hardened Multi-Agent System (MAS) and Agentic Module Store. It powers specialized AI agents operating under an event-driven architecture with multi-tenant isolation, HMAC authentication, rate limiting, and automated multi-judge QA evaluation.

---

## 🌟 Key Features

- **10 Specialized Agent Modules**: Router Agent, Customer Service Agent, Finance Agent, Operations Agent, Sales Agent, Complaint Agent, Executive Admin Agent, Marketing Agent, HR Agent, and Technical Support Agent.
- **Enterprise Multi-Tenant Security**: Tenant-isolated short-term and long-term memory (`tenant_id:session_id`), HMAC SHA-256 webhook signature verification (`X-Tenant-Signature`), and timestamp replay protection.
- **Resilient Circuit Breakers**: Automatic loop interception (`handoff_count > 3`), Dead Letter Queue (DLQ) with Heap OOM capping, and token-bucket rate limiting per tenant.
- **Automated Adversarial QA & Benchmarking**: Integrated 5-judge evaluation suite and 6-stage security & chaos test runner.

---

## 📖 Documentation & Guides

- 📘 [Master Operational Guide (USER_MANUAL.md)](USER_MANUAL.md) — Step-by-step developer, PM, DevOps, QA, and Emergency Runbook.
- 📐 [System Architecture Specification](docs/architecture/ARCHITECTURE.md) — High-level architecture, memory model, and security protocols.
- 📄 [API Contracts](docs/architecture/API_CONTRACTS.md) — Payload schemas and event structures.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/mfikrifajrulmajdi-code/agentic-module-store.git
cd agentic-module-store
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your API keys:
```bash
cp .env.example .env
```

### 3. Build & Run
```bash
# Compile TypeScript
npx tsc

# Start Gateway Server & Swarm
node dist/index.js
```

### 4. Run Test Suites
```bash
# Security & Chaos Test Suite
node test_security_qa.js

# Master 10-Agent E2E Integration Suite
node test_e2e_all.js
```

---

## 🛡️ License

MIT License. See [LICENSE](LICENSE) for details.
