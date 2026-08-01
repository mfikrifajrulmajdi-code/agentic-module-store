import { Message } from '../types';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface IMemoryProvider {
  // Short Term Memory (Tenant-Isolated)
  saveMessage(tenant_id: string, session_id: string, message: Message): Promise<void>;
  getConversationContext(tenant_id: string, session_id: string, limit?: number): Promise<Message[]>;
  
  // Session State (Tenant-Isolated)
  updateSessionState(tenant_id: string, session_id: string, stateUpdate: any): Promise<void>;
  getSessionState(tenant_id: string, session_id: string): Promise<Record<string, any>>;

  // Long Term Memory
  saveVector(tenant_id: string, namespace: string, text: string, metadata: any): Promise<void>;
  searchSimilar(tenant_id: string, namespace: string, query: string, topK?: number): Promise<SearchResult[]>;
}
