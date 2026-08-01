# API Contracts & Standard I/O

## 1. External Ingress API (Webhook/Receive)
**Endpoint:** `POST /api/v1/ingress`
**Purpose:** Accept messages from any external channel.

**Request Payload:**
```json
{
  "tenant_id": "tnt_01H8X...",
  "session_id": "sess_998877",
  "user_identifier": "+628123456789",
  "channel": "whatsapp",
  "message": {
    "type": "text",
    "content": "Halo, saya mau komplain barang rusak!",
    "media_url": null
  },
  "metadata": {
    "user_name": "Budi"
  }
}
```

**Response (Sync or Async Ack):**
```json
{
  "status": "processing",
  "trace_id": "trc_112233"
}
```

## 2. External Egress API (Send to Channel)
When an Agent completes a task, the system emits an egress payload to the configured webhook of the channel provider.

**Egress Payload:**
```json
{
  "tenant_id": "tnt_01H8X...",
  "session_id": "sess_998877",
  "user_identifier": "+628123456789",
  "channel": "whatsapp",
  "agent_id": "COMPLAINT_AGENT",
  "response": {
    "type": "text",
    "content": "Mohon maaf atas ketidaknyamanan Anda. Bisa kirimkan foto barangnya?",
    "suggested_actions": []
  }
}
```

## 3. Inter-Agent Communication Contract (Internal Event Bus)

**Agent Task Request:**
```json
{
  "event_type": "AGENT_INVOKE",
  "target_agent": "SALES_AGENT",
  "session_id": "sess_998877",
  "tenant_id": "tnt_01H8X...",
  "context": {
    "recent_messages": [...],
    "handoff_summary": "User is interested in upgrading their plan.",
    "extracted_entities": {
      "product_interest": "Pro Plan"
    }
  }
}
```
