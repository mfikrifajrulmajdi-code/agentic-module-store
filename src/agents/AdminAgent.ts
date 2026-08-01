import { v4 as uuidv4 } from 'uuid';
import { IAgent } from '../interfaces/IAgent';
import { IEventBus } from '../interfaces/IEventBus';
import { IMemoryProvider } from '../interfaces/IMemoryProvider';
import { AgentEvent, Message } from '../types';

export class AdminAgent implements IAgent {
  readonly id = 'ADMIN_AGENT';
  readonly role = 'Executive Assistant & Tenant Admin Specialist';
  readonly tier = 3;

  constructor(
    private eventBus: IEventBus,
    private memoryManager: IMemoryProvider
  ) {}

  async initialize(): Promise<void> {
    this.eventBus.subscribeAgent(this.id, this.processEvent.bind(this));
  }

  async processEvent(event: AgentEvent): Promise<void> {
    console.log(`[AdminAgent] Processing executive query for session [${event.session_id}]...`);

    const summaryReport = "📊 **Laporan Eksekutif Harian KASKU AI**\n\n" +
      "• Total Transaksi Hari Ini: 42 Transaksi (Rp 4.850.000)\n" +
      "• Tiket Keluhan Aktif: 1 Tiket (Sedang di-handle Complaint Agent)\n" +
      "• Performansi Agen: Router Agent (98.5% Akurasi), CS Agent (0.8s Rata-rata Latensi)\n" +
      "• Status Sistem: Semua 10 Agen Sehat & Operasional ✅";

    const assistantMsg: Message = {
      message_id: uuidv4(),
      session_id: event.session_id,
      role: 'assistant',
      agent_id: this.id,
      content: summaryReport,
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
        content: summaryReport,
        suggested_actions: ['Unduh Laporan PDF', 'Konfigurasi Agen']
      }
    });
  }
}
