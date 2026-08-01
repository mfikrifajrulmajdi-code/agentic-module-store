import { AgentEvent, EgressPayload } from '../types';

export interface IEventBus {
  publishAgentEvent(event: AgentEvent): Promise<void>;
  publishEgress(payload: EgressPayload): Promise<void>;
  subscribeAgent(agentId: string, callback: (event: AgentEvent) => Promise<void>): void;
  subscribeEgress(callback: (payload: EgressPayload) => Promise<void>): void;
}
