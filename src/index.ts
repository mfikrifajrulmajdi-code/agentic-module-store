import { AdminAgent } from './agents/AdminAgent';
import { ComplaintAgent } from './agents/ComplaintAgent';
import { CSAgent } from './agents/CSAgent';
import { EvaluatorAgent } from './agents/EvaluatorAgent';
import { FinanceAgent } from './agents/FinanceAgent';
import { HRAgent } from './agents/HRAgent';
import { MarketingAgent } from './agents/MarketingAgent';
import { OpsAgent } from './agents/OpsAgent';
import { RouterAgent } from './agents/RouterAgent';
import { SalesAgent } from './agents/SalesAgent';
import { SupportAgent } from './agents/SupportAgent';
import { LocalEventBus } from './core/EventBus';
import { Gateway } from './core/Gateway';
import { LearningSystem } from './core/LearningSystem';
import { MockMemoryManager } from './core/MemoryManager';

async function bootstrap() {
  console.log('================================================================');
  console.log('--- Initializing KASKU AI Multi-Agent System (All 10 Agents) ---');
  console.log('================================================================');

  const eventBus = new LocalEventBus();
  const memoryManager = new MockMemoryManager();
  const learningSystem = new LearningSystem(memoryManager);
  const evaluatorAgent = new EvaluatorAgent(learningSystem, memoryManager);

  await memoryManager.saveVector(
    'tnt_001',
    'product_catalog',
    'KASKU Enterprise Suite: Sistem multi-agent lengkap untuk otomatisasi CS, Finance, & Sales.',
    { category: 'software' }
  );

  const agents = [
    new RouterAgent(eventBus),
    new CSAgent(eventBus, memoryManager),
    new FinanceAgent(eventBus, memoryManager),
    new OpsAgent(eventBus, memoryManager),
    new SalesAgent(eventBus, memoryManager),
    new ComplaintAgent(eventBus, memoryManager),
    new AdminAgent(eventBus, memoryManager),
    new MarketingAgent(eventBus, memoryManager),
    new HRAgent(eventBus, memoryManager),
    new SupportAgent(eventBus, memoryManager)
  ];

  for (const agent of agents) {
    await agent.initialize();
  }

  console.log(`[KASKU AI] Successfully initialized and registered ${agents.length} agents.\n`);

  eventBus.subscribeEgress(async (payload) => {
    console.log('\n================ Outbound Webhook Emitted ================');
    console.log(JSON.stringify(payload, null, 2));
    console.log('========================================================\n');

    evaluatorAgent.evaluateTurn(
      payload.tenant_id,
      payload.session_id,
      payload.agent_id,
      'System Request',
      payload.response.content
    ).then((evalResult) => {
      console.log(`[QA Evaluator] Session [${payload.session_id}] Agent [${payload.agent_id}] Score: ${evalResult.score}/100 | Passed: ${evalResult.passed}`);
    }).catch(err => console.error('[QA Evaluator] Error:', err.message));
  });

  const gateway = new Gateway(eventBus, memoryManager, 3000);
  gateway.start();
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
});
