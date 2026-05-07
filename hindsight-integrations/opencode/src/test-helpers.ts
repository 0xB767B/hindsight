import type { HindsightConfig } from "./config.js";

export function makeConfig(overrides: Partial<HindsightConfig> = {}): HindsightConfig {
  return {
    autoRecall: true,
    recallBudget: "mid",
    recallMaxTokens: 1024,
    recallTypes: ["world", "experience"],
    recallContextTurns: 1,
    recallMaxQueryChars: 800,
    recallPromptPreamble: "",
    recallTags: [],
    recallTagsMatch: "any",
    autoRetain: true,
    retainMode: "full-session",
    retainEveryNTurns: 3,
    retainOverlapTurns: 2,
    retainContext: "opencode",
    retainTags: [],
    retainMetadata: {},
    hindsightApiUrl: null,
    hindsightApiToken: null,
    bankId: null,
    bankIdPrefix: "",
    dynamicBankId: false,
    dynamicBankGranularity: ["agent", "project"],
    bankMission: "",
    retainMission: null,
    agentName: "opencode",
    dualBankEnabled: false,
    userBankId: null,
    userBankMission:
      "Track personal coding preferences, workflow habits, tool configurations, " +
      "and communication style. Ignore project-specific details.",
    userRetainMission:
      "Extract only personal preferences, habits, and user-specific knowledge. " +
      "Ignore project architecture, codebase conventions, and technical decisions " +
      "tied to a specific project.",
    debug: false,
    ...overrides,
  };
}
