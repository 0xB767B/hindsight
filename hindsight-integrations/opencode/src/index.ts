/**
 * Hindsight OpenCode Plugin — persistent long-term memory for OpenCode agents.
 *
 * Provides:
 *   - Custom tools: hindsight_retain, hindsight_recall, hindsight_reflect
 *   - Auto-retain on session.idle
 *   - Memory injection on session.created via system transform
 *   - Memory preservation during context compaction
 *
 * @example
 * ```json
 * // opencode.json
 * { "plugin": ["@vectorize-io/opencode-hindsight"] }
 *
 * // With options:
 * { "plugin": [["@vectorize-io/opencode-hindsight", { "bankId": "my-bank" }]] }
 * ```
 */

import type { Plugin } from "@opencode-ai/plugin";
import { HindsightClient } from "@vectorize-io/hindsight-client";
import { loadConfig } from "./config.js";
import type { BankIds } from "./config.js";
import { deriveBankId, deriveUserBankId, deriveProjectBankId } from "./bank.js";
import { createTools } from "./tools.js";
import { createHooks, type PluginState } from "./hooks.js";
import { debugLog } from "./config.js";

// Module-level state persists across sessions (plugin is instantiated per session,
// but the module is loaded once per OpenCode server process).
const state: PluginState = {
  turnCount: 0,
  missionsSet: new Set(),
  recalledSessions: new Set(),
  lastRetainedTurn: new Map(),
};

const HindsightPlugin: Plugin = async (input, options) => {
  const config = loadConfig(options);

  const apiUrl = config.hindsightApiUrl;
  if (!apiUrl) {
    console.error(
      "[Hindsight] No API URL configured. Set HINDSIGHT_API_URL environment variable " +
        "or add hindsightApiUrl to ~/.hindsight/opencode.json"
    );
    // Return empty hooks — graceful degradation
    return {};
  }

  const client = new HindsightClient({
    baseUrl: apiUrl,
    apiKey: config.hindsightApiToken || undefined,
  });

  let bankIds: BankIds;
  if (config.dualBankEnabled) {
    const projectBankId = deriveProjectBankId(config, input.directory);
    const userBankId = deriveUserBankId(config);
    bankIds = { project: projectBankId, user: userBankId };
    debugLog(
      config,
      `Dual-bank mode: project=${projectBankId}, user=${userBankId}, API: ${apiUrl}`
    );
  } else {
    const bankId = deriveBankId(config, input.directory);
    bankIds = { project: bankId, user: null };
    debugLog(config, `Initialized with bank: ${bankId}, API: ${apiUrl}`);
  }

  const tools = createTools(client, bankIds, config, state.missionsSet);
  const hooks = createHooks(
    client,
    bankIds,
    config,
    state,
    input.client as unknown as Parameters<typeof createHooks>[4]
  );

  return {
    tool: tools,
    ...hooks,
  };
};

// Named export for direct import
export { HindsightPlugin };

// Default export is the Plugin function itself — OpenCode's loader calls the
// default export directly.
export default HindsightPlugin;

// Re-export types for consumers
export type { HindsightConfig, BankIds } from "./config.js";
export type { PluginState } from "./hooks.js";
export { loadConfig } from "./config.js";
export { deriveBankId, deriveUserBankId, deriveProjectBankId } from "./bank.js";
