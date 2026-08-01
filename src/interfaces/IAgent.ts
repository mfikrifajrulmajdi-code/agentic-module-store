import { AgentEvent, EgressPayload } from '../types';

export interface IAgent {
  readonly id: string;
  readonly role: string;
  readonly tier: 1 | 2 | 3;
  initialize(): Promise<void>;
  processEvent(event: AgentEvent): Promise<void>;
}
