import { IMemoryProvider, SearchResult } from '../interfaces/IMemoryProvider';
import { Message } from '../types';

export class MockMemoryManager implements IMemoryProvider {
  private stm = new Map<string, Message[]>();
  private state = new Map<string, Record<string, any>>();
  private ltm = new Map<string, Array<{ text: string; metadata: any }>>();
  private sessionLocks = new Map<string, Promise<void>>();

  private async acquireLock(key: string): Promise<() => void> {
    while (this.sessionLocks.has(key)) {
      await this.sessionLocks.get(key);
    }
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolveLock = res;
    });
    this.sessionLocks.set(key, lockPromise);
    return () => {
      this.sessionLocks.delete(key);
      resolveLock();
    };
  }

  async saveMessage(tenant_id: string, session_id: string, message: Message): Promise<void> {
    const key = `${tenant_id}:${session_id}`;
    const unlock = await this.acquireLock(key);
    try {
      const current = this.stm.get(key) || [];
      current.push(message);
      this.stm.set(key, current);
    } finally {
      unlock();
    }
  }

  async getConversationContext(tenant_id: string, session_id: string, limit: number = 20): Promise<Message[]> {
    const key = `${tenant_id}:${session_id}`;
    const current = this.stm.get(key) || [];
    
    let totalLength = 0;
    const truncated: Message[] = [];
    const sliced = current.slice(-limit);

    for (let i = sliced.length - 1; i >= 0; i--) {
      const msg = sliced[i];
      if (totalLength + msg.content.length > 4000) break;
      totalLength += msg.content.length;
      truncated.unshift(msg);
    }

    return truncated;
  }

  async updateSessionState(tenant_id: string, session_id: string, stateUpdate: any): Promise<void> {
    const key = `${tenant_id}:${session_id}`;
    const unlock = await this.acquireLock(key);
    try {
      const current = this.state.get(key) || {};
      this.state.set(key, { ...current, ...stateUpdate });
    } finally {
      unlock();
    }
  }

  async getSessionState(tenant_id: string, session_id: string): Promise<Record<string, any>> {
    const key = `${tenant_id}:${session_id}`;
    return this.state.get(key) || {};
  }

  async saveVector(tenant_id: string, namespace: string, text: string, metadata: any): Promise<void> {
    const key = `${tenant_id}:${namespace}`;
    const current = this.ltm.get(key) || [];
    current.push({ text, metadata });
    this.ltm.set(key, current);
  }

  async searchSimilar(tenant_id: string, namespace: string, query: string, topK: number = 3): Promise<SearchResult[]> {
    const key = `${tenant_id}:${namespace}`;
    const docs = this.ltm.get(key) || [];
    
    const matches = docs.filter(d => d.text.toLowerCase().includes(query.toLowerCase()));
    
    return matches.slice(0, topK).map((m, idx) => ({
      id: `doc_${idx}`,
      content: m.text,
      score: 0.9,
      metadata: m.metadata
    }));
  }
}
