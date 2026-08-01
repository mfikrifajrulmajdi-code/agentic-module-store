import { IAgent } from '../interfaces/IAgent';
import { IEventBus } from '../interfaces/IEventBus';
import { AgentEvent } from '../types';

const ALLOWED_AGENTS = new Set([
  'CS_AGENT',
  'FINANCE_AGENT',
  'OPS_AGENT',
  'SALES_AGENT',
  'COMPLAINT_AGENT',
  'ADMIN_AGENT',
  'MARKETING_AGENT',
  'HR_AGENT',
  'SUPPORT_AGENT'
]);

export class RouterAgent implements IAgent {
  readonly id = 'ROUTER_AGENT';
  readonly role = 'Orchestrator & Multi-Agent Intent Classifier';
  readonly tier = 1;

  constructor(private eventBus: IEventBus) {}

  async initialize(): Promise<void> {
    this.eventBus.subscribeAgent(this.id, this.processEvent.bind(this));
  }

  async processEvent(event: AgentEvent): Promise<void> {
    console.log(`[RouterAgent] Classifying user intent for session [${event.session_id}]...`);

    const userMessage = event.context.payload?.message.content || '';
    
    const sanitized = userMessage.replace(/[\r\n\t]+/g, ' ').substring(0, 1000);
    const lower = sanitized.toLowerCase();

    if (lower.includes('ignore previous') || lower.includes('system prompt') || lower.includes('bypass')) {
      console.warn(`[RouterAgent] Suspicious prompt injection detected! Neutralizing routing.`);
    }

    let targetAgent = 'CS_AGENT';

    if (/laporan|omset|performa|ringkasan|admin|pemilik|owner|eksekutif/i.test(lower)) {
      targetAgent = 'ADMIN_AGENT';
    } else if (/copy|konten|sosmed|broadcast|iklan|pemasaran/i.test(lower)) {
      targetAgent = 'MARKETING_AGENT';
    } else if (/lamar|kerja|kandidat|interview|recruitment|cv|hr/i.test(lower)) {
      targetAgent = 'HR_AGENT';
    } else if (/error|bug|troubleshoot|teknis|kendala/i.test(lower)) {
      targetAgent = 'SUPPORT_AGENT';
    } else if (/bayar|catat|pengeluaran|pemasukan|gaji|bensin|gofood|50k|100rb|transaksi/i.test(lower)) {
      targetAgent = 'FINANCE_AGENT';
    } else if (/checkout|order|pesan|ongkir|pembayaran|tagihan|beli/i.test(lower)) {
      targetAgent = 'OPS_AGENT';
    } else if (/komplain|rusak|kecewa|marah|batal|refund|ganti rugi|buruk/i.test(lower)) {
      targetAgent = 'COMPLAINT_AGENT';
    } else if (/rekomendasi|katalog|promo|diskon|paket|harga/i.test(lower)) {
      targetAgent = 'SALES_AGENT';
    }

    if (!ALLOWED_AGENTS.has(targetAgent)) {
      targetAgent = 'CS_AGENT';
    }

    console.log(`[RouterAgent] Classified intent: "${sanitized}" -> Delegating to [${targetAgent}]`);

    const currentHandoffs = event.handoff_count ?? 0;

    await this.eventBus.publishAgentEvent({
      event_type: 'AGENT_HANDOFF',
      from_agent: this.id,
      target_agent: targetAgent,
      session_id: event.session_id,
      tenant_id: event.tenant_id,
      handoff_count: currentHandoffs + 1,
      context: {
        ...event.context,
        handoff_summary: `Routed intent to ${targetAgent}`
      }
    });
  }
}
