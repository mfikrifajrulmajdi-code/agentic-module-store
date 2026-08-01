# Product Requirements Document (PRD): KASKU AI Multi-Agent System

## ⚠️ STATED ASSUMPTIONS
- **Goal:** Create a 100% backend, decoupled, and stateless Multi-Agent System (MAS) called "KASKU AI".
- **Scale:** Multi-tenant architecture designed to serve multiple companies concurrently with strict data isolation.
- **I/O Protocol:** Agnostic JSON in, JSON out. Does not care if the origin is WhatsApp, Web, or internal API.
- **Agent Count:** 10 core agents (Router, Finance, CS, Sales, Ops, Admin, Marketing, HR, Support, Complaint).
- **Intelligence:** Multi-LLM tiering (cheap models for routing/basic tasks, expensive models for complex/EQ tasks).

## 1. Executive Summary
KASKU AI is an independent, headless Multi-Agent System designed to act as the "brain" for various operational, customer-facing, and internal business workflows. The system abstracts away the frontend channels, providing a pure API-driven engine that processes standard JSON payloads, routes them to the appropriate specialized AI Agent, and returns a standardized JSON response.

## 2. Core Objectives
1. **Stateless & Decoupled:** Agents must not rely on local server state. Context and memory must be injected or retrieved via abstract interfaces per request.
2. **Modular Architecture:** Any of the 10 agents can be enabled, disabled, or hot-swapped without bringing down the system.
3. **Multi-Tenant:** The system must support `tenant_id` at its core to isolate memory, prompts, and configurations for different clients.
4. **Optimized Cost:** Route tasks to the most cost-effective LLM capable of handling them (Model Tiering).

## 3. Product Features & Requirements
### 3.1. Standardized JSON Gateway
- **Input:** Accept `session_id`, `tenant_id`, `channel`, `payload` (text, audio url, image url), and `metadata`.
- **Output:** Return standardized actions (e.g., `reply_text`, `trigger_webhook`, `escalate_human`).

### 3.2. Agent Memory & Context Interface
- **Short-Term Memory:** Conversation history (e.g., last 20 messages).
- **Long-Term Memory:** Vectorized context (RAG) for user preferences, company knowledge base, and past resolutions.
- **Abstraction:** The memory system must use an interface (e.g., `IMemoryProvider`) so the underlying DB can be Redis, Postgres, Pinecone, or MongoDB without changing agent logic.

### 3.3. Inter-Agent Communication (Handoffs)
- Agents must be able to securely transfer context to another agent if the user's intent shifts (e.g., CS Agent handing off to Finance Agent).
- Must include a `handoff_reason` and `summary_of_context`.

## 4. In-Scope Agents
1. **Router Agent:** Orchestrator. Decides which agent gets the message.
2. **Finance Agent:** Extracts financial intents (transactions, balances).
3. **CS Agent:** General FAQ and info.
4. **Sales Agent:** Persuasion, catalogs, upselling.
5. **Ops Agent:** Checkout, shipping, operational flows.
6. **Admin Agent:** Assistant for tenant owners.
7. **Marketing Agent:** Generates copy and broadcasts.
8. **HR Agent:** Recruitment screening.
9. **Support Agent:** Technical troubleshooting.
10. **Complaint Agent:** De-escalation and high-EQ handling.

## 5. Out of Scope
- Frontend UI development.
- Direct integration to WhatsApp/Telegram APIs (this is handled by an external channel gateway).
- Native database implementations (system relies on generic interfaces).
