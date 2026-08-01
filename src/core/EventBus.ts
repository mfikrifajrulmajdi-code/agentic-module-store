import { EventEmitter } from 'events';
import { IEventBus } from '../interfaces/IEventBus';
import { AgentEvent, EgressPayload } from '../types';

export class LocalEventBus implements IEventBus {
  private bus = new EventEmitter();
  private deadLetterQueue: AgentEvent[] = [];
  private readonly MAX_DLQ_SIZE = 1000;

  private pushToDLQ(event: AgentEvent) {
    if (this.deadLetterQueue.length >= this.MAX_DLQ_SIZE) {
      this.deadLetterQueue.shift();
    }
    this.deadLetterQueue.push(event);
  }

  async publishAgentEvent(event: AgentEvent): Promise<void> {
    const handoffCount = event.handoff_count ?? 0;
    if (handoffCount > 3) {
      console.warn(`[EventBus] MAX_HANDOFF_LIMIT exceeded for session [${event.session_id}]. Diverting to Egress/DLQ.`);
      this.pushToDLQ(event);
      await this.publishEgress({
        tenant_id: event.tenant_id,
        session_id: event.session_id,
        user_identifier: event.context.payload?.user_identifier || 'unknown',
        channel: event.context.payload?.channel || 'unknown',
        agent_id: 'SYSTEM_FALLBACK',
        response: {
          type: 'text',
          content: 'Maaf, sistem mengalami kendala rute internal. Mohon hubungi bantuan manusia.'
        }
      });
      return;
    }

    const channel = `agent:${event.target_agent || 'broadcast'}`;
    console.log(`[EventBus] Publishing to [${channel}]:`, event.event_type, `(Handoffs: ${handoffCount})`);
    this.bus.emit(channel, event);
  }

  async publishEgress(payload: EgressPayload): Promise<void> {
    console.log(`[EventBus] Publishing Egress to user [${payload.user_identifier}] via [${payload.channel}]:`, payload.response.content);
    this.bus.emit('egress', payload);
  }

  subscribeAgent(agentId: string, callback: (event: AgentEvent) => Promise<void>): void {
    const channel = `agent:${agentId}`;
    this.bus.on(channel, async (event: AgentEvent) => {
      try {
        await callback(event);
      } catch (err) {
        console.error(`[EventBus] Subscriber Panic on Agent [${agentId}]. Moving event to Dead Letter Queue:`, err);
        this.pushToDLQ(event);
      }
    });
    console.log(`[EventBus] Subscribed agent [${agentId}] to channel [${channel}]`);
  }

  subscribeEgress(callback: (payload: EgressPayload) => Promise<void>): void {
    this.bus.on('egress', async (payload: EgressPayload) => {
      try {
        await callback(payload);
      } catch (err) {
        console.error(`[EventBus] Error handling egress payload:`, err);
      }
    });
    console.log(`[EventBus] Subscribed egress listener.`);
  }

  getDeadLetterQueue(): AgentEvent[] {
    return [...this.deadLetterQueue];
  }
}
