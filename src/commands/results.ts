import { loadConfig } from '../services/config';
import { getBackend } from '../backends/index';
import { ProtocolEngine } from '../services/protocol-engine';
import { t, formatDate } from '../services/i18n';
import type { AgentFleetConfigV3, AggregatedResults } from '../types';
import type { SyncBackend } from '../backends/types';

interface ResultsOptions {
  json?: boolean;
}

interface ResultsDependencies {
  loadConfigFn?: () => Promise<AgentFleetConfigV3>;
  createBackend?: (name: string, config: Record<string, unknown>) => SyncBackend;
  createEngine?: (backend: SyncBackend, agentId: string) => ProtocolEngine;
  exit?: (code: number) => void;
}

export async function resultsCommand(
  options: ResultsOptions = {},
  _command?: unknown,
  dependencies: ResultsDependencies = {},
): Promise<void> {
  const exit = dependencies.exit ?? ((code: number) => { process.exitCode = code; });

  const loadConfigFn = dependencies.loadConfigFn ?? loadConfig;
  let config: AgentFleetConfigV3;
  try {
    config = await loadConfigFn();
  } catch (err) {
    console.error(`❌ ${t('results.error', { message: (err as Error).message })}`);
    exit(1);
    return;
  }

  const createBackendFn = dependencies.createBackend ?? getBackend;
  const backend = createBackendFn(config.backend, config.backendConfig);
  await backend.initialize();

  const engine = dependencies.createEngine
    ? dependencies.createEngine(backend, config.agentId)
    : new ProtocolEngine(backend, config.agentId);

  const aggregated: AggregatedResults = await engine.aggregateResults();

  await backend.shutdown();

  if (options.json) {
    console.log(JSON.stringify(aggregated, null, 2));
    return;
  }

  // Human-readable output
  for (const err of aggregated.errors) {
    console.warn(`⚠️ ${err}`);
  }

  if (aggregated.totalTasks === 0) {
    console.log(t('results.no_tasks'));
    return;
  }

  console.log(`\n📊 ${t('results.header', { total: aggregated.totalTasks, completed: aggregated.completedTasks, failed: aggregated.failedTasks, pending: aggregated.pendingTasks })}\n`);

  for (const task of aggregated.tasks) {
    const statusIcon = task.taskStatus === 'completed' ? '✅' : task.taskStatus === 'failed' ? '❌' : '⏳';
    const title = task.title ? ` — ${task.title}` : '';
    console.log(`${statusIcon} ${task.taskId}${title}`);

    if (task.agents.length === 0) {
      console.log(`   ${t('results.no_agent_results')}`);
    } else {
      for (const agent of task.agents) {
        const agentIcon = agent.status === 'completed' ? '✅' : '❌';
        const duration = `${(agent.durationMs / 1000).toFixed(1)}s`;
        const completed = agent.completedAt ? ` ${t('results.agent_completed_at', { date: formatDate(agent.completedAt) })}` : '';
        console.log(`   ${agentIcon} ${agent.agentId}  ${t('results.agent_status', { status: agent.status, exitCode: agent.exitCode ?? 'N/A' })}  ${duration}${completed}`);
        if (agent.summary) {
          console.log(`      ${t('results.agent_summary', { summary: agent.summary })}`);
        }
        if (agent.artifacts && agent.artifacts.length > 0) {
          console.log(`      ${t('results.agent_artifacts', { artifacts: agent.artifacts.join(', ') })}`);
        }
        if (agent.error) {
          console.log(`      ${t('results.agent_error', { error: agent.error })}`);
        }
      }
    }
    console.log();
  }

  console.log(t('results.footer', { total: aggregated.totalTasks, completed: aggregated.completedTasks, failed: aggregated.failedTasks, pending: aggregated.pendingTasks }));
  console.log();
}
