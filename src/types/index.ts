export interface Payload {
  type: string;
  content: string;
  media_url?: string | null;
}

export interface IngressPayload {
  tenant_id: string;
  session_id: string;
  user_identifier: string;
  channel: string;
  message: Payload;
  metadata?: Record<string, any>;
}

export interface EgressPayload {
  tenant_id: string;
  session_id: string;
  user_identifier: string;
  channel: string;
  agent_id: string;
  response: Payload & { suggested_actions?: string[] };
}

export interface Message {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  agent_id?: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface AgentEvent {
  event_type: string;
  from_agent?: string;
  target_agent?: string;
  session_id: string;
  tenant_id: string;
  handoff_count?: number;
  context: {
    recent_messages?: Message[];
    handoff_summary?: string;
    extracted_entities?: Record<string, any>;
    payload?: IngressPayload;
  };
}
