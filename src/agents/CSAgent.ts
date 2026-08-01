import { v4 as uuidv4 } from 'uuid';
import { IAgent } from '../interfaces/IAgent';
import { IEventBus } from '../interfaces/IEventBus';
import { IMemoryProvider } from '../interfaces/IMemoryProvider';
import { LLMEngine } from '../core/LLMEngine';
import { AgentEvent, Message } from '../types';

export class CSAgent implements IAgent {
  readonly id = 'CS_AGENT';
  readonly role = 'Customer Service FAQ Specialist';
  readonly tier = 1;

  constructor(
    private eventBus: IEventBus,
    private memoryManager: IMemoryProvider
  ) {}

  async initialize(): Promise<void> {
    this.eventBus.subscribeAgent(this.id, this.processEvent.bind(this));
  }

  async processEvent(event: AgentEvent): Promise<void> {
    console.log(`[CSAgent] Processing request for session [${event.session_id}]...`);

    const userMessage = event.context.payload?.message.content || '';

    const kbResults = await this.memoryManager.searchSimilar(
      event.tenant_id,
      'company_faq',
      userMessage
    );

    const contextText = kbResults.length > 0 ? `Knowledge Base: ${kbResults[0].content}` : 'Umum';

    const llmRes = await LLMEngine.generate({
      tier: 1,
      systemPrompt: `Anda adalah Customer Service Agent KASKU AI. Jawab pertanyaan pengguna dengan ramah, profesional, dan ringkas dalam Bahasa Indonesia berdasarkan konteks: ${contextText}`,
      userPrompt: userMessage
    });

    const answer = llmRes.content;

    const assistantMsg: Message = {
      message_id: uuidv4(),
      session_id: event.session_id,
      role: 'assistant',
      agent_id: this.id,
      content: answer,
      created_at: new Date()
    };
    await this.memoryManager.saveMessage(event.tenant_id, event.session_id, assistantMsg);

    await this.eventBus.publishEgress({
      tenant_id: event.tenant_id,
      session_id: event.session_id,
      user_identifier: event.context.payload?.user_identifier || 'unknown',
      channel: event.context.payload?.channel || 'unknown',
      agent_id: this.id,
      response: {
        type: 'text',
        content: answer
      }
    });
  }
}
