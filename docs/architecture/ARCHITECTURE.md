# System Architecture: KASKU AI (Enterprise Production Hardened v2.0)

## 1. High-Level Architecture Pattern
**Selected Pattern:** Modular Monolith transitioning to Event-Driven Microservices.
**Rationale:** Given the requirement for multi-tenancy, statelessness, and decoupling, an Event-Driven architecture allows agents to operate independently, scale horizontally, and communicate via a central message bus.

---

## 2. Core Architecture Components

### 2.1. Gateway API (Ingress/Egress)
- **Role:** Cryptographically verified single entry point to the MAS. Normalizes incoming webhooks into standard KASKU internal events.
- **Security Protocols:**
  - **HMAC SHA-256 Signature Verification:** All ingress requests validate the `X-Tenant-Signature` header to reject unauthenticated webhook injection.
  - **Token-Bucket Rate Limiter:** Enforces per-tenant traffic limits to prevent Denial of Wallet attacks on high-tier LLM models.

### 2.2. The Router Agent (Orchestrator)
- **Role:** Receives normalized payload, sanitizes user input against prompt injection vectors, and classifies intent via deterministic regex fast-path and Tier 1 model fallback.
- **Protections:** Input sanitization neutralizes prompt overrides (e.g. `ignore previous instructions`), mapping targets strictly to `ALLOWED_AGENTS`.

### 2.3. Agent Modules
- Stateless functions/classes implementing the `IAgent` interface.
- Triggered by specific events from the Orchestrator or other agents.
- Execute business logic, query LLMs, and emit `AGENT_RESPONSE` or `AGENT_HANDOFF` events.

### 2.4. Abstract Memory Provider (Tenant-Isolated)
- **Short-Term Memory (STM):** Fast, TTL-based storage scoped strictly by `${tenant_id}:${session_id}` to prevent BOLA/IDOR cross-tenant data leakage. Includes sliding-window token truncation.
- **Concurrency Control:** Mutex locking on session state updates to eliminate race conditions under high traffic.
- **Long-Term Memory (LTM):** Composite-indexed vector storage `${tenant_id}:${namespace}` for tenant-isolated semantic search.

---

## 3. Inter-Agent Communication Protocol & Resiliency
Agents communicate via an Event Bus using Pub/Sub.

```json
{
  "event_type": "AGENT_HANDOFF",
  "from_agent": "CS_AGENT",
  "target_agent": "SALES_AGENT",
  "session_id": "sess_123",
  "tenant_id": "tenant_abc",
  "handoff_count": 1,
  "context": {
    "handoff_summary": "User asked about pricing for Product X and wants to purchase."
  }
}
```

### Circuit Breakers & Resilience:
- **Max Handoff Limit (`handoff_count > 3`):** Prevents infinite agent handoff loops (event storms) by auto-terminating loops and routing fallback responses to Egress.
- **Dead Letter Queue (DLQ):** Unhandled subscriber exceptions or malformed JSON payloads are captured in a DLQ to prevent process crashes.

---

## 4. Multi-Tenant Security Strategy
- Cryptographically verified `tenant_id` at Gateway API.
- All STM and LTM calls mandate `(tenant_id, session_id)` parameters.
- Complete data isolation across database queries and vector searches.

---

## 5. Model Tiering Strategy
- **Tier 1 (Routing & Triage) - Fast & Cheap:** Gemini Flash / Claude 3 Haiku. Used by Router Agent, CS Agent.
- **Tier 2 (Logic & Ops) - Balanced:** Gemini Pro / Claude 3.5 Sonnet. Used by Ops Agent, Support Agent, Finance Agent, HR Agent.
- **Tier 3 (Complex & EQ) - High Intelligence:** GPT-4o / Claude 3.5 Sonnet / Gemini 1.5 Pro. Used by Sales Agent, Complaint Agent, Admin Agent, Marketing Agent.
