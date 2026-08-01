import { v4 as uuidv4 } from 'uuid';
import { IAgent } from '../interfaces/IAgent';
import { IEventBus } from '../interfaces/IEventBus';
import { IMemoryProvider } from '../interfaces/IMemoryProvider';
import { AgentEvent, Message } from '../types';
import { Validator } from '../utils/Validator';

export interface FinancialTransaction {
  amount: number;
  category: string;
  type: 'income' | 'expense';
  account: string;
  notes: string;
}

export class FinanceAgent implements IAgent {
  readonly id = 'FINANCE_AGENT';
  readonly role = 'Financial Transaction Extractor & Ledger Specialist';
  readonly tier = 2;

  constructor(
    private eventBus: IEventBus,
    private memoryManager: IMemoryProvider
  ) {}

  async initialize(): Promise<void> {
    this.eventBus.subscribeAgent(this.id, this.processEvent.bind(this));
  }

  async processEvent(event: AgentEvent): Promise<void> {
    console.log(`[FinanceAgent] Processing transaction extraction for session [${event.session_id}]...`);

    const userMessage = event.context.payload?.message.content || '';
    const transaction = this.extractTransaction(userMessage);

    const validation = Validator.validateFields(transaction, {
      amount: 'number',
      category: 'string',
      type: 'string',
      account: 'string'
    });

    if (!validation.valid) {
      console.error(`[FinanceAgent] Validation failed:`, validation.errors);
      return;
    }

    await this.memoryManager.updateSessionState(event.tenant_id, event.session_id, {
      last_transaction: transaction
    });

    const responseContent = `✅ Transaksi Berhasil Dicatat!\n- Jumlah: Rp ${transaction.amount.toLocaleString('id-ID')}\n- Kategori: ${transaction.category}\n- Tipe: ${transaction.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}\n- Akun/Metode: ${transaction.account}`;

    const assistantMsg: Message = {
      message_id: uuidv4(),
      session_id: event.session_id,
      role: 'assistant',
      agent_id: this.id,
      content: responseContent,
      metadata: { transaction },
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
        content: responseContent,
        suggested_actions: ['Lihat Laporan', 'Tambah Transaksi Lain']
      }
    });
  }

  private extractTransaction(text: string): FinancialTransaction {
    const amountMatch = text.match(/(\d+)\s*(k|rb|ribu|juta|jt)?/i);
    let amount = 0;
    if (amountMatch) {
      amount = parseInt(amountMatch[1], 10);
      const unit = (amountMatch[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'rb' || unit === 'ribu') amount *= 1000;
      if (unit === 'juta' || unit === 'jt') amount *= 1000000;
    }

    let category = 'Lain-lain';
    if (/kopi|makan|minum|restoran|gofood/i.test(text)) category = 'Makanan & Minuman';
    else if (/bensin|servis|parkir|transpor/i.test(text)) category = 'Transportasi';
    else if (/gaji|bonus|omset|penjualan/i.test(text)) category = 'Pendapatan Business';

    let account = 'Tunai';
    if (/gopay/i.test(text)) account = 'Gopay';
    else if (/bca/i.test(text)) account = 'BCA';
    else if (/ovo/i.test(text)) account = 'OVO';
    else if (/qris/i.test(text)) account = 'QRIS';

    const isIncome = /gaji|dapat|masuk|terima|omset/i.test(text);

    return {
      amount: amount || 25000,
      category,
      type: isIncome ? 'income' : 'expense',
      account,
      notes: text
    };
  }
}
