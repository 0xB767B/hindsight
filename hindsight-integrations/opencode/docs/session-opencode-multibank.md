# OpenCode hindsight banks configuration

**Session ID:** ses_202ad4ec9ffeO30gDQGNWlRYfD
**Created:** 5/6/2026, 2:45:48 PM
**Updated:** 5/6/2026, 5:51:54 PM

---

## User

We are in the hindsight repository, in sub-directory hindsight-integrations/opencode. I am interested how the hindsight banks are configured. Analyse accordingly.

---

## Assistant (Plan · Gemma 31B · 1.3s)

---

## User

We are in the hindsight repository, in sub-directory hindsight-integrations/opencode. I am interested how the hindsight banks are configured. Analyse accordingly.

---

## Assistant (Plan · Claude Opus 4.6 · 57.6s)

_Thinking:_

The user wants to understand how "hindsight banks" are configured in this codebase. Let me explore the codebase to find relevant configuration related to banks.

**Tool: task**

**Input:**
```json
{
  "description": "Find hindsight bank config",
  "prompt": "Search the codebase at /home/mas/work/vectorize-io/hindsight for how \"banks\" are configured. Look for:\n1. Any files that define or configure \"banks\" (search for \"bank\" in filenames and file contents)\n2. Configuration files (YAML, JSON, TOML, env files) that reference banks\n3. Code that initializes or sets up banks\n4. Any documentation about banks\n\nFocus on the hindsight-integrations/opencode subdirectory first, then look at the broader repository if needed.\n\nReturn a comprehensive summary of:\n- What files define/configure banks\n- The structure of bank configuration\n- How banks are used/initialized in code\n- Any relevant types or interfaces for banks",
  "subagent_type": "explore"
}
```

**Output:**
```
task_id: ses_202acf316ffeu1oau9NGATl20E (for resuming to continue this task if needed)

<task_result>
Here is a comprehensive summary of how "banks" are configured in the Hindsight codebase:

---

## Summary: Bank Configuration in Hindsight

### What is a Bank?

A **memory bank** is an isolated container storing memories, documents, entities, relationships, and directives for a specific context. Banks are completely isolated from each other. They are auto-created on first use with default settings.

---

### Key Files That Define/Configure Banks

**OpenCode integration (primary focus):**
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.ts` — Bank ID derivation and mission management logic
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/config.ts` — `HindsightConfig` interface with bank-related fields
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.test.ts` — Tests
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts` — Uses bankId for retain/recall/reflect operations
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts` — Uses bankId in hook lifecycle
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/index.ts` — Entry point that derives bankId and passes it through

**Other integrations:**
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/claude-code/scripts/lib/bank.py` — Python equivalent
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/codex/scripts/lib/bank.py`
- `/home/mas/work/vectorize-io/hindsight/hindsight-integrations/paperclip/src/bank.ts`

**Documentation:**
- `/home/mas/work/vectorize-io/hindsight/hindsight-docs/docs/developer/api/memory-banks.mdx` — API docs
- `/home/mas/work/vectorize-io/hindsight/hindsight-docs/docs/developer/api/bank-templates.mdx` — Template docs
- `/home/mas/work/vectorize-io/hindsight/hindsight-docs/static/bank-template-schema.json` — Full JSON Schema for bank templates

**Server-side:**
- `/home/mas/work/vectorize-io/hindsight/hindsight-api-slim/hindsight_api/engine/retain/bank_utils.py`
- Multiple Alembic migrations for bank schema

**Control plane UI:**
- `/home/mas/work/vectorize-io/hindsight/hindsight-control-plane/src/components/bank-selector.tsx`
- `/home/mas/work/vectorize-io/hindsight/hindsight-control-plane/src/components/bank-config-view.tsx`
- `/home/mas/work/vectorize-io/hindsight/hindsight-control-plane/src/lib/bank-context.tsx`

---

### Bank Configuration Structure (Client-Side — OpenCode)

From `HindsightConfig` in `config.ts`:

```typescript
// Bank section
bankId: string | null;           // Static bank ID (env: HINDSIGHT_BANK_ID)
bankIdPrefix: string;            // Prefix prepended to bank ID
dynamicBankId: boolean;          // Enable dynamic ID derivation (env: HINDSIGHT_DYNAMIC_BANK_ID)
dynamicBankGranularity: string[]; // Fields for dynamic ID: "agent", "project", "channel", "user"
bankMission: string;             // Mission text for reflect (env: HINDSIGHT_BANK_MISSION)
retainMission: string | null;    // Mission text for retain extraction
agentName: string;               // Agent name used in dynamic IDs (env: HINDSIGHT_AGENT_NAME)
```

**Defaults:** `bankId: null`, `dynamicBankId: false`, `dynamicBankGranularity: ["agent", "project"]`, `agentName: "opencode"`

**Config loading order:** Defaults → `~/.hindsight/opencode.json` → plugin options → environment variables

---

### Bank Configuration Structure (Server-Side — Bank Template)

From `bank-template-schema.json`, a `BankTemplateConfig` includes:
- `reflect_mission` — Mission for reflect operations
- `retain_mission` — Steers extraction focus
- `retain_extraction_mode` — `concise` | `verbose` | `custom`
- `retain_custom_instructions` — Custom extraction prompt
- `retain_chunk_size` — Max tokens per chunk
- `enable_observations` — Toggle observation consolidation
- `observations_mission` — Controls synthesis
- `disposition_skepticism/literalism/empathy` — Personality traits (1-5)
- `entity_labels` — Controlled vocabulary for entities
- `retain_strategies` — Named strategy map
- `recall_budget_*` — Budget function configuration (fixed/adaptive)
- `mcp_enabled_tools` — MCP tool allowlist
- Various consolidation and reflect token limits

---

### How Banks Are Initialized/Used

1. **ID Derivation** (`bank.ts` → `deriveBankId`):
   - **Static mode** (default): Uses `config.bankId` or falls back to `"opencode"`, optionally prefixed
   - **Dynamic mode**: Composes segments from `["agent", "project", "channel", "user"]` joined by `::` (e.g., `"opencode::my-project"`)

2. **Mission Setup** (`bank.ts` → `ensureBankMission`):
   - Called lazily before first retain/reflect operation
   - Calls `client.createBank(bankId, { reflectMission, retainMission })` once per bank
   - Tracked in an in-memory `Set<string>` to avoid repeated calls

3. **Usage in Operations**:
   - `client.retain(bankId, content, opts)` — Store memories
   - `client.recall(bankId, query, opts)` — Retrieve memories
   - `client.reflect(bankId, query, opts)` — Synthesize/reason over memories

---

### Relevant Types/Interfaces

- `HindsightConfig` (TypeScript, `config.ts`) — Client-side config with bank fields
- `BankTemplateManifest` (JSON Schema) — Server-side template: `{ version, bank, mental_models, directives }`
- `BankTemplateConfig` (JSON Schema) — All per-bank configurable fields
- `BankTemplateDirective` — Named directive with content/priority/tags
- `BankTemplateMentalModel` — Auto-refreshing synthesized views with trigger settings
- `HindsightClient` interface (from `@vectorize-io/hindsight-client`) — `createBank`, `retain`, `recall`, `reflect` methods
</task_result>
```

---

## Assistant (Plan · Claude Opus 4.6 · 11.9s)

## Hindsight Bank Configuration Analysis

Banks are **isolated memory containers** that store memories, documents, entities, relationships, and directives. Here's how they're configured in the `opencode` integration:

---

### Core Configuration (`src/config.ts`)

The `HindsightConfig` interface exposes these bank-related fields:

| Field | Default | Env Var | Purpose |
|-------|---------|---------|---------|
| `bankId` | `null` | `HINDSIGHT_BANK_ID` | Static bank ID |
| `bankIdPrefix` | `""` | — | Prefix prepended to derived ID |
| `dynamicBankId` | `false` | `HINDSIGHT_DYNAMIC_BANK_ID` | Enable dynamic ID derivation |
| `dynamicBankGranularity` | `["agent", "project"]` | — | Segments composing dynamic ID |
| `bankMission` | (string) | `HINDSIGHT_BANK_MISSION` | Mission for reflect operations |
| `retainMission` | `null` | — | Steers extraction focus |
| `agentName` | `"opencode"` | `HINDSIGHT_AGENT_NAME` | Agent name in dynamic IDs |

Config is loaded in order: **Defaults → `~/.hindsight/opencode.json` → plugin options → env vars**.

---

### Bank ID Derivation (`src/bank.ts`)

Two modes:

1. **Static** (default): Uses `config.bankId` or falls back to `"opencode"`, with optional prefix.
2. **Dynamic**: Joins segments from `dynamicBankGranularity` with `::` separator (e.g., `"opencode::my-project"`). Available segments: `agent`, `project`, `channel`, `user`.

---

### Bank Mission Setup (`src/bank.ts` → `ensureBankMission`)

Called lazily before the first retain/reflect operation. It:
1. Calls `client.createBank(bankId, { reflectMission, retainMission })` once per bank
2. Tracks already-initialized banks in an in-memory `Set<string>` to avoid redundant calls

---

### Server-Side Template (from `bank-template-schema.json`)

Banks on the server support a rich template with:
- `reflect_mission` / `retain_mission` — Steering prompts
- `retain_extraction_mode` — `concise` | `verbose` | `custom`
- `disposition_skepticism/literalism/empathy` — Personality traits (1–5)
- `entity_labels` — Controlled vocabulary for graph entities
- `retain_strategies` — Named extraction strategies
- `recall_budget_*` — Budget function config (fixed/adaptive)
- Observation consolidation, MCP tool allowlists, token limits

---

### Usage in Operations (`src/tools.ts`, `src/hooks.ts`)

Once the bank is initialized, it's used in three core operations:
- **`retain(bankId, content)`** — Store memories from conversations
- **`recall(bankId, query)`** — Retrieve relevant memories
- **`reflect(bankId, query)`** — Synthesize/reason over stored memories

---

Would you like me to dive deeper into any specific aspect — such as the dynamic ID derivation logic, the server-side template schema, or how banks interact with hooks?

---

## User

Tell me more how this integration configures the bank missions.

---

## Assistant (Plan · Claude Opus 4.6 · 5.0s)

_Thinking:_

Let me look at the bank mission configuration in detail.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.ts</path>
<type>file</type>
<content>
1: /**
2:  * Bank ID derivation and mission management.
3:  *
4:  * Port of Claude Code plugin's bank.py, adapted for OpenCode's context model.
5:  *
6:  * Dimensions for dynamic bank IDs:
7:  *   - agent   → configured name or "opencode"
8:  *   - project → derived from working directory basename
9:  */
10: 
11: import { basename } from "node:path";
12: import type { HindsightConfig } from "./config.js";
13: import { debugLog } from "./config.js";
14: import type { HindsightClient } from "@vectorize-io/hindsight-client";
15: 
16: const DEFAULT_BANK_NAME = "opencode";
17: const VALID_FIELDS = new Set(["agent", "project", "channel", "user"]);
18: 
19: /**
20:  * Derive a bank ID from context and config.
21:  *
22:  * Static mode: returns config.bankId or DEFAULT_BANK_NAME.
23:  * Dynamic mode: composes from granularity fields joined by '::'.
24:  */
25: export function deriveBankId(config: HindsightConfig, directory: string): string {
26:   const prefix = config.bankIdPrefix;
27: 
28:   if (!config.dynamicBankId) {
29:     const base = config.bankId || DEFAULT_BANK_NAME;
30:     return prefix ? `${prefix}-${base}` : base;
31:   }
32: 
33:   const fields = config.dynamicBankGranularity?.length
34:     ? config.dynamicBankGranularity
35:     : ["agent", "project"];
36: 
37:   for (const f of fields) {
38:     if (!VALID_FIELDS.has(f)) {
39:       console.error(
40:         `[Hindsight] Unknown dynamicBankGranularity field "${f}" — ` +
41:           `valid: ${[...VALID_FIELDS].sort().join(", ")}`
42:       );
43:     }
44:   }
45: 
46:   const channelId = process.env.HINDSIGHT_CHANNEL_ID || "";
47:   const userId = process.env.HINDSIGHT_USER_ID || "";
48: 
49:   const fieldMap: Record<string, string> = {
50:     agent: config.agentName || "opencode",
51:     project: directory ? basename(directory) : "unknown",
52:     channel: channelId || "default",
53:     user: userId || "anonymous",
54:   };
55: 
56:   // bank_id is stored as-is server-side; HTTP path encoding is the client layer's job.
57:   const segments = fields.map((f) => fieldMap[f] || "unknown");
58:   const baseBankId = segments.join("::");
59: 
60:   return prefix ? `${prefix}-${baseBankId}` : baseBankId;
61: }
62: 
63: /**
64:  * Set bank mission on first use, skip if already set.
65:  * Uses an in-memory Set (plugin is long-lived, unlike Claude Code's ephemeral hooks).
66:  */
67: export async function ensureBankMission(
68:   client: HindsightClient,
69:   bankId: string,
70:   config: HindsightConfig,
71:   missionsSet: Set<string>
72: ): Promise<void> {
73:   const mission = config.bankMission;
74:   if (!mission?.trim()) return;
75:   if (missionsSet.has(bankId)) return;
76: 
77:   try {
78:     await client.createBank(bankId, {
79:       reflectMission: mission,
80:       retainMission: config.retainMission || undefined,
81:     });
82:     missionsSet.add(bankId);
83:     // Cap tracked banks
84:     if (missionsSet.size > 10000) {
85:       const keys = [...missionsSet].sort();
86:       for (const k of keys.slice(0, keys.length >> 1)) {
87:         missionsSet.delete(k);
88:       }
89:     }
90:     debugLog(config, `Set mission for bank: ${bankId}`);
91:   } catch (e) {
92:     // Don't fail if mission set fails — bank may not exist yet
93:     debugLog(config, `Could not set bank mission for ${bankId}: ${e}`);
94:   }
95: }

(End of file - total 95 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/config.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/config.ts</path>
<type>file</type>
<content>
1: /**
2:  * Configuration management for the Hindsight OpenCode plugin.
3:  *
4:  * Loading order (later entries win):
5:  *   1. Built-in defaults
6:  *   2. User config file (~/.hindsight/opencode.json)
7:  *   3. Plugin options (from opencode.json plugin tuple)
8:  *   4. Environment variable overrides
9:  */
10: 
11: import { readFileSync } from "node:fs";
12: import { join } from "node:path";
13: import { homedir } from "node:os";
14: 
15: export interface HindsightConfig {
16:   // Recall
17:   autoRecall: boolean;
18:   recallBudget: string;
19:   recallMaxTokens: number;
20:   recallTypes: string[];
21:   recallContextTurns: number;
22:   recallMaxQueryChars: number;
23:   recallPromptPreamble: string;
24:   recallTags: string[];
25:   recallTagsMatch: "any" | "all" | "any_strict" | "all_strict";
26: 
27:   // Retain
28:   autoRetain: boolean;
29:   retainMode: string;
30:   retainEveryNTurns: number;
31:   retainOverlapTurns: number;
32:   retainContext: string;
33:   retainTags: string[];
34:   retainMetadata: Record<string, string>;
35: 
36:   // Connection
37:   hindsightApiUrl: string | null;
38:   hindsightApiToken: string | null;
39: 
40:   // Bank
41:   bankId: string | null;
42:   bankIdPrefix: string;
43:   dynamicBankId: boolean;
44:   dynamicBankGranularity: string[];
45:   bankMission: string;
46:   retainMission: string | null;
47:   agentName: string;
48: 
49:   // Misc
50:   debug: boolean;
51: }
52: 
53: const DEFAULTS: HindsightConfig = {
54:   // Recall
55:   autoRecall: true,
56:   recallBudget: "mid",
57:   recallMaxTokens: 1024,
58:   recallTypes: ["world", "experience"],
59:   recallContextTurns: 1,
60:   recallMaxQueryChars: 800,
61:   recallTags: [],
62:   recallTagsMatch: "any",
63:   recallPromptPreamble:
64:     "Relevant memories from past conversations (prioritize recent when " +
65:     "conflicting). Only use memories that are directly useful to continue " +
66:     "this conversation; ignore the rest:",
67: 
68:   // Retain
69:   autoRetain: true,
70:   retainMode: "full-session",
71:   retainEveryNTurns: 3,
72:   retainOverlapTurns: 2,
73:   retainContext: "opencode",
74:   retainTags: [],
75:   retainMetadata: {},
76: 
77:   // Connection
78:   hindsightApiUrl: null,
79:   hindsightApiToken: null,
80: 
81:   // Bank
82:   bankId: null,
83:   bankIdPrefix: "",
84:   dynamicBankId: false,
85:   dynamicBankGranularity: ["agent", "project"],
86:   bankMission: "",
87:   retainMission: null,
88:   agentName: "opencode",
89: 
90:   // Misc
91:   debug: false,
92: };
93: 
94: /** Env var → config key + type mapping */
95: const ENV_OVERRIDES: Record<string, [keyof HindsightConfig, "string" | "bool" | "int"]> = {
96:   HINDSIGHT_API_URL: ["hindsightApiUrl", "string"],
97:   HINDSIGHT_API_TOKEN: ["hindsightApiToken", "string"],
98:   HINDSIGHT_BANK_ID: ["bankId", "string"],
99:   HINDSIGHT_AGENT_NAME: ["agentName", "string"],
100:   HINDSIGHT_AUTO_RECALL: ["autoRecall", "bool"],
101:   HINDSIGHT_AUTO_RETAIN: ["autoRetain", "bool"],
102:   HINDSIGHT_RETAIN_MODE: ["retainMode", "string"],
103:   HINDSIGHT_RECALL_BUDGET: ["recallBudget", "string"],
104:   HINDSIGHT_RECALL_MAX_TOKENS: ["recallMaxTokens", "int"],
105:   HINDSIGHT_RECALL_MAX_QUERY_CHARS: ["recallMaxQueryChars", "int"],
106:   HINDSIGHT_RECALL_CONTEXT_TURNS: ["recallContextTurns", "int"],
107:   HINDSIGHT_DYNAMIC_BANK_ID: ["dynamicBankId", "bool"],
108:   HINDSIGHT_BANK_MISSION: ["bankMission", "string"],
109:   HINDSIGHT_DEBUG: ["debug", "bool"],
110: };
111: 
112: function castEnv(value: string, typ: "string" | "bool" | "int"): string | boolean | number | null {
113:   if (typ === "bool") return ["true", "1", "yes"].includes(value.toLowerCase());
114:   if (typ === "int") {
115:     const n = parseInt(value, 10);
116:     return isNaN(n) ? null : n;
117:   }
118:   return value;
119: }
120: 
121: function loadSettingsFile(path: string): Record<string, unknown> {
122:   try {
123:     const raw = readFileSync(path, "utf-8");
124:     return JSON.parse(raw);
125:   } catch {
126:     return {};
127:   }
128: }
129: 
130: export function loadConfig(pluginOptions?: Record<string, unknown>): HindsightConfig {
131:   // 1. Start with defaults
132:   const config: Record<string, unknown> = { ...DEFAULTS };
133: 
134:   // 2. User config file (~/.hindsight/opencode.json)
135:   const userConfigPath = join(homedir(), ".hindsight", "opencode.json");
136:   const fileConfig = loadSettingsFile(userConfigPath);
137:   for (const [key, value] of Object.entries(fileConfig)) {
138:     if (value !== null && value !== undefined) {
139:       config[key] = value;
140:     }
141:   }
142: 
143:   // 3. Plugin options (from opencode.json: ["@vectorize-io/opencode-hindsight", { ... }])
144:   if (pluginOptions) {
145:     for (const [key, value] of Object.entries(pluginOptions)) {
146:       if (value !== null && value !== undefined) {
147:         config[key] = value;
148:       }
149:     }
150:   }
151: 
152:   // 4. Environment variable overrides (highest priority)
153:   for (const [envName, [key, typ]] of Object.entries(ENV_OVERRIDES)) {
154:     const val = process.env[envName];
155:     if (val !== undefined) {
156:       const castVal = castEnv(val, typ);
157:       if (castVal !== null) {
158:         config[key] = castVal;
159:       }
160:     }
161:   }
162: 
163:   // Array env vars (comma-separated)
164:   const recallTagsEnv = process.env["HINDSIGHT_RECALL_TAGS"];
165:   if (recallTagsEnv !== undefined) {
166:     config["recallTags"] = recallTagsEnv
167:       .split(",")
168:       .map((t) => t.trim())
169:       .filter(Boolean);
170:   }
171:   const recallTagsMatchEnv = process.env["HINDSIGHT_RECALL_TAGS_MATCH"];
172:   if (recallTagsMatchEnv !== undefined) {
173:     config["recallTagsMatch"] = recallTagsMatchEnv;
174:   }
175: 
176:   const result = config as unknown as HindsightConfig;
177: 
178:   // Validate enum-like fields to catch typos early
179:   const VALID_RETAIN_MODES = ["full-session", "last-turn"];
180:   if (!VALID_RETAIN_MODES.includes(result.retainMode)) {
181:     console.error(
182:       `[Hindsight] Unknown retainMode "${result.retainMode}" — ` +
183:         `valid: ${VALID_RETAIN_MODES.join(", ")}. Falling back to "full-session".`
184:     );
185:     result.retainMode = "full-session";
186:   }
187: 
188:   const VALID_TAGS_MATCH = ["any", "all", "any_strict", "all_strict"];
189:   if (!VALID_TAGS_MATCH.includes(result.recallTagsMatch)) {
190:     console.error(
191:       `[Hindsight] Unknown recallTagsMatch "${result.recallTagsMatch}" — ` +
192:         `valid: ${VALID_TAGS_MATCH.join(", ")}. Falling back to "any".`
193:     );
194:     result.recallTagsMatch = "any";
195:   }
196: 
197:   const VALID_BUDGETS = ["low", "mid", "high"];
198:   if (!VALID_BUDGETS.includes(result.recallBudget)) {
199:     console.error(
200:       `[Hindsight] Unknown recallBudget "${result.recallBudget}" — ` +
201:         `valid: ${VALID_BUDGETS.join(", ")}. Falling back to "mid".`
202:     );
203:     result.recallBudget = "mid";
204:   }
205: 
206:   return result;
207: }
208: 
209: export function debugLog(config: HindsightConfig, ...args: unknown[]): void {
210:   if (config.debug) {
211:     console.error("[Hindsight]", ...args);
212:   }
213: }

(End of file - total 213 lines)
</content>
```

---

## Assistant (Plan · Claude Opus 4.6 · 4.1s)

Now let me see where `ensureBankMission` is called to understand the lifecycle:

**Tool: grep**

**Input:**
```json
{
  "pattern": "ensureBankMission",
  "path": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src"
}
```

**Output:**
```
Found 16 matches
/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.test.ts:
  Line 251:     it("calls ensureBankMission before retain when missionsSet provided", async () => {

  Line 272:     it("calls ensureBankMission before reflect when missionsSet provided", async () => {


/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts:
  Line 13: import { ensureBankMission } from "./bank.js";

  Line 43:         await ensureBankMission(client, bankId, config, missionsSet);

  Line 95:         await ensureBankMission(client, bankId, config, missionsSet);


/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts:
  Line 23: import { ensureBankMission } from "./bank.js";

  Line 182:     await ensureBankMission(hindsightClient, bankId, config, state.missionsSet);

  Line 304:       await ensureBankMission(hindsightClient, bankId, config, state.missionsSet);


/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.ts:
  Line 67: export async function ensureBankMission(


/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.test.ts:
  Line 2: import { deriveBankId, ensureBankMission } from "./bank.js";

  Line 89: describe("ensureBankMission", () => {

  Line 95:     await ensureBankMission(client, "test-bank", config, missionsSet);

  Line 109:     await ensureBankMission(client, "test-bank", config, missionsSet);

  Line 119:     await ensureBankMission(client, "test-bank", config, missionsSet);

  Line 130:       ensureBankMission(client, "test-bank", config, missionsSet)

  Line 140:     await ensureBankMission(client, "test-bank", config, missionsSet);

```

---

## Assistant (Plan · Claude Opus 4.6 · 4.1s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts",
  "offset": 170,
  "limit": 40
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts</path>
<type>file</type>
<content>
170:       documentId = sessionId;
171:     } else {
172:       // Sliding window: retainEveryNTurns + overlap
173:       const windowTurns = config.retainEveryNTurns + config.retainOverlapTurns;
174:       targetMessages = sliceLastTurnsByUserBoundary(messages, windowTurns);
175:       // Chunked mode: unique document per chunk
176:       documentId = `${sessionId}-${Date.now()}`;
177:     }
178: 
179:     const { transcript } = prepareRetentionTranscript(targetMessages, true);
180:     if (!transcript) return;
181: 
182:     await ensureBankMission(hindsightClient, bankId, config, state.missionsSet);
183:     await hindsightClient.retain(bankId, transcript, {
184:       documentId,
185:       context: config.retainContext,
186:       tags: config.retainTags.length ? config.retainTags : undefined,
187:       metadata: Object.keys(config.retainMetadata).length
188:         ? { ...config.retainMetadata, session_id: sessionId }
189:         : { session_id: sessionId },
190:       async: true,
191:     });
192:   }
193: 
194:   /** Auto-retain conversation transcript */
195:   async function handleSessionIdle(sessionId: string): Promise<void> {
196:     debugLog(config, `handleSessionIdle called for session ${sessionId}`);
197:     if (!config.autoRetain) return;
198: 
199:     const messages = await getSessionMessages(sessionId);
200:     if (!messages.length) return;
201: 
202:     // Count user turns
203:     const userTurns = messages.filter((m) => m.role === "user").length;
204:     const lastRetained = state.lastRetainedTurn.get(sessionId) || 0;
205:     debugLog(
206:       config,
207:       `handleSessionIdle: userTurns=${userTurns}, lastRetained=${lastRetained}, retainEveryNTurns=${config.retainEveryNTurns}`
208:     );
209: 

(Showing lines 170-209 of 330. Use offset=210 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts",
  "offset": 30,
  "limit": 80
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts</path>
<type>file</type>
<content>
30:       "user preferences, project context, decisions, and anything worth recalling in future sessions. " +
31:       "Be specific — include who, what, when, and why.",
32:     args: {
33:       content: tool.schema
34:         .string()
35:         .describe("The information to remember. Be specific and self-contained."),
36:       context: tool.schema
37:         .string()
38:         .optional()
39:         .describe("Optional context about where this information came from."),
40:     },
41:     async execute(args) {
42:       if (missionsSet) {
43:         await ensureBankMission(client, bankId, config, missionsSet);
44:       }
45:       await client.retain(bankId, args.content, {
46:         context: args.context || config.retainContext,
47:         tags: config.retainTags.length ? config.retainTags : undefined,
48:         metadata: Object.keys(config.retainMetadata).length ? config.retainMetadata : undefined,
49:       });
50:       return "Memory stored successfully.";
51:     },
52:   });
53: 
54:   const hindsight_recall = tool({
55:     description:
56:       "Search long-term memory for relevant information. Use this proactively before " +
57:       "answering questions about past conversations, user preferences, project history, " +
58:       "or any topic where prior context would help. When in doubt, recall first.",
59:     args: {
60:       query: tool.schema
61:         .string()
62:         .describe("Natural language search query. Be specific about what you need to know."),
63:     },
64:     async execute(args) {
65:       const response = await client.recall(bankId, args.query, {
66:         budget: config.recallBudget as "low" | "mid" | "high",
67:         maxTokens: config.recallMaxTokens,
68:         types: config.recallTypes,
69:         tags: config.recallTags.length ? config.recallTags : undefined,
70:         tagsMatch: config.recallTags.length ? config.recallTagsMatch : undefined,
71:       });
72: 
73:       const results = response.results || [];
74:       if (!results.length) return "No relevant memories found.";
75: 
76:       const formatted = formatMemories(results);
77:       return `Found ${results.length} relevant memories (as of ${formatCurrentTime()} UTC):\n\n${formatted}`;
78:     },
79:   });
80: 
81:   const hindsight_reflect = tool({
82:     description:
83:       "Generate a thoughtful answer using long-term memory. Unlike recall (which returns " +
84:       "raw memories), reflect synthesizes memories into a coherent answer. Use for questions " +
85:       'like "What do you know about this user?" or "Summarize our project decisions."',
86:     args: {
87:       query: tool.schema.string().describe("The question to answer using long-term memory."),
88:       context: tool.schema
89:         .string()
90:         .optional()
91:         .describe("Optional additional context to guide the reflection."),
92:     },
93:     async execute(args) {
94:       if (missionsSet) {
95:         await ensureBankMission(client, bankId, config, missionsSet);
96:       }
97:       const response = await client.reflect(bankId, args.query, {
98:         context: args.context,
99:         budget: config.recallBudget as "low" | "mid" | "high",
100:       });
101: 
102:       return response.text || "No relevant information found to reflect on.";
103:     },
104:   });
105: 
106:   return { hindsight_retain, hindsight_recall, hindsight_reflect };
107: }

(End of file - total 107 lines)
</content>
```

---

## Assistant (Plan · Claude Opus 4.6 · 28.0s)

Here's a detailed breakdown of how bank missions are configured in this integration:

---

## Bank Mission Configuration

### Two Mission Types

The integration supports two distinct missions:

1. **`bankMission`** (maps to `reflectMission` on the server) — Guides the reflect/synthesis operation. Controls how the bank reasons about stored memories when answering queries.
2. **`retainMission`** (maps to `retainMission` on the server) — Steers extraction focus during retain operations, controlling what information gets extracted from conversations.

### How Missions Are Set

**Configuration sources** (in `src/config.ts:82-87`):
- `bankMission` defaults to `""` (empty string)
- `retainMission` defaults to `null`
- Both can be set via `~/.hindsight/opencode.json`, plugin options, or env vars
- `bankMission` has an env var override: `HINDSIGHT_BANK_MISSION`
- `retainMission` has no env var override — it must be set via config file or plugin options

### Lazy Initialization Pattern (`src/bank.ts:67-95`)

Missions are **not** set at plugin startup. Instead, `ensureBankMission` is called lazily — right before the first operation that needs it:

```typescript
export async function ensureBankMission(
  client: HindsightClient,
  bankId: string,
  config: HindsightConfig,
  missionsSet: Set<string>
): Promise<void> {
  const mission = config.bankMission;
  if (!mission?.trim()) return;          // No-op if mission is empty
  if (missionsSet.has(bankId)) return;   // Already set for this bank

  await client.createBank(bankId, {
    reflectMission: mission,
    retainMission: config.retainMission || undefined,
  });
  missionsSet.add(bankId);
}
```

Key behaviors:
- **Guard on empty**: If `bankMission` is empty/whitespace, the function returns immediately — no API call is made and the bank is auto-created with server defaults on first use.
- **Idempotent per bank**: Uses an in-memory `Set<string>` (`missionsSet`) to track which banks have already had their mission set. Each bank ID is only configured once per plugin lifetime.
- **Eviction**: If the set exceeds 10,000 entries, the oldest half is purged (sorted alphabetically, first half deleted).
- **Failure-tolerant**: Errors are caught and logged at debug level — a failed mission set doesn't block retain/recall/reflect operations.

### Where Missions Are Applied (Call Sites)

Missions are ensured before these operations:

| Call site | Operation | File |
|-----------|-----------|------|
| `tools.ts:43` | Before manual `hindsight_retain` tool execution | `src/tools.ts` |
| `tools.ts:95` | Before `hindsight_reflect` tool execution | `src/tools.ts` |
| `hooks.ts:182` | Before auto-retain (session end) | `src/hooks.ts` |
| `hooks.ts:304` | Before auto-retain (idle/periodic) | `src/hooks.ts` |

Notably, `hindsight_recall` does **not** call `ensureBankMission` — recall is read-only and doesn't need the bank to be pre-configured.

### Server-Side Effect

`client.createBank(bankId, { reflectMission, retainMission })` is an upsert — it creates the bank if it doesn't exist, or updates the mission fields if it does. This means:
- First time: bank is created with the configured missions
- Subsequent calls (after eviction from the set): missions are re-applied, effectively a no-op if unchanged

### Example Configuration

In `~/.hindsight/opencode.json` or plugin options:
```json
{
  "bankMission": "You are a memory system for a senior developer working on a distributed systems project. Focus on architectural decisions, API contracts, and debugging patterns.",
  "retainMission": "Extract technical decisions, code patterns, and project architecture details. Ignore routine coding tasks."
}
```

Or via environment:
```bash
export HINDSIGHT_BANK_MISSION="Focus on user preferences and project conventions"
```

---

## User

Write a markdown file that describes these findings.

---

## Assistant (Build · Claude Opus 4.6 · 24.5s)

_Thinking:_

The user wants me to write a markdown file documenting the bank mission configuration findings.

**Tool: write**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/docs/bank-mission-configuration.md",
  "content": "# Bank Mission Configuration\n\nThis document describes how bank missions are configured in the Hindsight OpenCode integration.\n\n## Overview\n\nA **memory bank** is an isolated container storing memories, documents, entities, relationships, and directives for a specific context. Banks are auto-created on first use with default settings. Missions allow you to steer how the bank extracts and synthesizes information.\n\n## Two Mission Types\n\nThe integration supports two distinct missions:\n\n| Mission | Config key | Server field | Purpose |\n|---------|-----------|--------------|---------|\n| Reflect mission | `bankMission` | `reflectMission` | Guides synthesis when answering queries via reflect |\n| Retain mission | `retainMission` | `retainMission` | Steers what information gets extracted during retain |\n\n## Configuration Sources\n\nMissions can be set through the standard config loading order (later entries win):\n\n1. **Built-in defaults** — `bankMission: \"\"`, `retainMission: null`\n2. **User config file** (`~/.hindsight/opencode.json`)\n3. **Plugin options** (from opencode.json plugin tuple)\n4. **Environment variables** (highest priority)\n\n### Environment Variable Support\n\n| Config key | Env var | Notes |\n|-----------|---------|-------|\n| `bankMission` | `HINDSIGHT_BANK_MISSION` | String value |\n| `retainMission` | _(none)_ | Must be set via config file or plugin options |\n\n### Example Configuration\n\nIn `~/.hindsight/opencode.json` or plugin options:\n\n```json\n{\n  \"bankMission\": \"You are a memory system for a senior developer working on a distributed systems project. Focus on architectural decisions, API contracts, and debugging patterns.\",\n  \"retainMission\": \"Extract technical decisions, code patterns, and project architecture details. Ignore routine coding tasks.\"\n}\n```\n\nOr via environment:\n\n```bash\nexport HINDSIGHT_BANK_MISSION=\"Focus on user preferences and project conventions\"\n```\n\n## Lazy Initialization Pattern\n\nMissions are **not** set at plugin startup. Instead, `ensureBankMission` (in `src/bank.ts`) is called lazily right before the first operation that needs it.\n\n### Logic\n\n```typescript\nexport async function ensureBankMission(\n  client: HindsightClient,\n  bankId: string,\n  config: HindsightConfig,\n  missionsSet: Set<string>\n): Promise<void> {\n  const mission = config.bankMission;\n  if (!mission?.trim()) return;          // No-op if mission is empty\n  if (missionsSet.has(bankId)) return;   // Already set for this bank\n\n  await client.createBank(bankId, {\n    reflectMission: mission,\n    retainMission: config.retainMission || undefined,\n  });\n  missionsSet.add(bankId);\n}\n```\n\n### Key Behaviors\n\n- **Guard on empty**: If `bankMission` is empty or whitespace, no API call is made. The bank will be auto-created with server defaults on first use.\n- **Idempotent per bank**: An in-memory `Set<string>` tracks which banks have already been configured. Each bank ID is only sent a `createBank` call once per plugin lifetime.\n- **Eviction**: If the tracking set exceeds 10,000 entries, the oldest half is purged (sorted alphabetically).\n- **Failure-tolerant**: Errors are caught and logged at debug level. A failed mission-set does not block retain/recall/reflect operations.\n\n## Call Sites\n\n`ensureBankMission` is invoked before these operations:\n\n| Call site | Operation | File |\n|-----------|-----------|------|\n| Before manual retain | `hindsight_retain` tool execution | `src/tools.ts:43` |\n| Before reflect | `hindsight_reflect` tool execution | `src/tools.ts:95` |\n| Before auto-retain (session end) | Automatic retention on session close | `src/hooks.ts:182` |\n| Before auto-retain (idle/periodic) | Automatic retention on idle timer | `src/hooks.ts:304` |\n\n`hindsight_recall` does **not** call `ensureBankMission` — recall is read-only and does not require the bank to be pre-configured.\n\n## Server-Side Effect\n\n`client.createBank(bankId, { reflectMission, retainMission })` is an upsert:\n\n- **First call**: Creates the bank with the configured missions.\n- **Subsequent calls** (e.g., after eviction from the tracking set): Re-applies missions. This is effectively a no-op if the values are unchanged.\n\n## Bank ID Derivation\n\nThe bank that receives the mission is identified by its derived ID. Two modes exist:\n\n### Static Mode (default)\n\nUses `config.bankId` or falls back to `\"opencode\"`, with an optional prefix:\n\n```\nbankIdPrefix + \"-\" + (bankId || \"opencode\")\n```\n\n### Dynamic Mode\n\nEnabled via `dynamicBankId: true`. Composes segments from `dynamicBankGranularity` joined by `::`:\n\n```\nopencode::my-project\n```\n\nAvailable segments: `agent`, `project`, `channel`, `user`.\n\n## Related Config Fields\n\n| Field | Default | Env var | Description |\n|-------|---------|---------|-------------|\n| `bankId` | `null` | `HINDSIGHT_BANK_ID` | Static bank ID override |\n| `bankIdPrefix` | `\"\"` | — | Prefix prepended to derived bank ID |\n| `dynamicBankId` | `false` | `HINDSIGHT_DYNAMIC_BANK_ID` | Enable dynamic ID derivation |\n| `dynamicBankGranularity` | `[\"agent\", \"project\"]` | — | Segments composing dynamic ID |\n| `agentName` | `\"opencode\"` | `HINDSIGHT_AGENT_NAME` | Agent name used in dynamic IDs |\n| `bankMission` | `\"\"` | `HINDSIGHT_BANK_MISSION` | Reflect mission text |\n| `retainMission` | `null` | — | Retain extraction mission text |\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · Claude Opus 4.6 · 9.5s)

Written to `hindsight-integrations/opencode/docs/bank-mission-configuration.md`. The document covers:

- The two mission types (reflect and retain) and their purposes
- All configuration sources and their precedence
- The lazy initialization pattern with idempotency and failure tolerance
- Exact call sites where missions are applied
- The server-side upsert semantics
- Bank ID derivation (static vs dynamic) that determines which bank receives the mission
- A full table of related config fields

---

## User

Ok, now we have an idea how bank missions are implemented currently. For my taste, one bank - as we curretly have -  is not enough. It collects project specific data as well as user specific data. I would like to have these two concerns seperated. This has the advantage, that I can (re-)use the user specific data in other projects as well. What is your thought about such a setup?

---

## Assistant (Plan · Claude Opus 4.6 · 4479.4s)

_Thinking:_

The user wants to separate concerns into two banks: one for project-specific data and one for user-specific data. Let me think about this architecturally.

Currently the integration derives a single bank ID (either static or dynamic). The dynamic mode can compose segments like `agent::project`, but it's still one bank per context.

The user's idea is sound: user-specific memories (preferences, coding style, tool preferences, etc.) should be portable across projects, while project-specific memories (architecture decisions, codebase conventions, etc.) should be scoped to that project.

Let me think about how this could work with the existing architecture.

This is a well-motivated separation. Here's my analysis:

## Why It Makes Sense

The current single-bank model conflates two fundamentally different scopes:

- **User memories** — personal preferences, coding style, tool choices, communication style. These are portable and relevant regardless of which project you're working on.
- **Project memories** — architecture decisions, codebase conventions, dependency choices, debugging history. These are tied to a specific codebase and shared across users working on it.

Mixing them in one bank means:
1. When you start a new project, you lose access to your personal preferences unless you use the same bank (which then pollutes it with unrelated project data).
2. Recall queries get noisier — a question about "how do I prefer error handling?" competes with project-specific API patterns.
3. You can't share project context with teammates without also sharing personal preferences.

## How It Could Work

The integration would derive **two bank IDs** instead of one, and route operations accordingly:

| Bank | ID example | Contains | Shared across |
|------|-----------|----------|---------------|
| User bank | `opencode::mas` | Preferences, habits, style | All projects for this user |
| Project bank | `opencode::hindsight` | Architecture, conventions, decisions | All users on this project |

Each bank gets its own mission:
- **User bank mission**: "Track personal coding preferences, tool configurations, communication style, and workflow habits."
- **Project bank mission**: "Track architecture decisions, API contracts, codebase conventions, and debugging patterns for this project."

## Key Design Questions

Before planning implementation, I'd like your input on a few trade-offs:

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "question": "How should retain (storing memories) decide which bank to write to?",
      "header": "Retain routing",
      "options": [
        {
          "label": "LLM-classified",
          "description": "Let the server's extraction decide per-memory whether it's user-scoped or project-scoped based on content"
        },
        {
          "label": "Dual-write",
          "description": "Always retain to both banks; each bank's retainMission filters what it extracts"
        },
        {
          "label": "Tag-based hints",
          "description": "Add metadata/tags to retained content so the server routes appropriately"
        }
      ]
    },
    {
      "question": "How should recall (querying memories) work across banks?",
      "header": "Recall strategy",
      "options": [
        {
          "label": "Merge both (Recommended)",
          "description": "Query both banks in parallel and merge results, letting the model see user + project context together"
        },
        {
          "label": "Query selectively",
          "description": "Decide per-query which bank to hit based on the query content"
        },
        {
          "label": "Always both, separate sections",
          "description": "Query both but present results in clearly labeled sections (user vs project)"
        }
      ]
    },
    {
      "question": "Should the user bank ID be derived from an environment variable or config, independent of the project?",
      "header": "User bank identity",
      "options": [
        {
          "label": "OS username (Recommended)",
          "description": "Derive from OS user (e.g., 'opencode::user::mas') — zero config for single-user machines"
        },
        {
          "label": "Explicit config",
          "description": "Require HINDSIGHT_USER_ID or config field — more flexible but requires setup"
        },
        {
          "label": "Both with fallback",
          "description": "Use HINDSIGHT_USER_ID if set, fall back to OS username"
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "How should retain (storing memories) decide which bank to write to?"="Elaborate about pros/cons of your proposed options.", "How should recall (querying memories) work across banks?"="Elaborate on your proposed options. Pros/cons?", "Should the user bank ID be derived from an environment variable or config, independent of the project?"="Both with fallback". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · Claude Opus 4.6 · 32.2s)

Good, let me elaborate on the trade-offs for the first two questions. You've already settled on "both with fallback" for user bank identity — that makes sense (explicit config when needed, zero-config otherwise).

---

## Retain Routing: Pros/Cons

### Option 1: LLM-classified

The server's extraction pipeline inspects each piece of extracted information and routes it to either the user bank or project bank.

| | |
|---|---|
| **Pros** | Cleanest separation; no client-side complexity; the server already does NLU during extraction so classification is natural; no duplicate storage |
| **Cons** | Requires server-side changes (new routing logic); classification errors are silent and hard to debug; adds latency to the extraction pipeline; tight coupling to server capabilities you may not control |

### Option 2: Dual-write

Retain the same transcript to **both** banks simultaneously. Each bank's `retainMission` tells the server what to extract from it.

| | |
|---|---|
| **Pros** | Simple client implementation (two `retain()` calls); each bank's mission acts as a filter — the user bank extracts preferences while the project bank extracts architecture; no server-side changes needed; works today with existing API |
| **Cons** | Double API cost (two retain calls per transcript); some overlap in stored data if missions aren't precise enough; slightly higher latency (mitigated by parallel calls + `async: true`) |

### Option 3: Tag-based hints

Add metadata tags to retained content (e.g., `scope: "user"` or `scope: "project"`) that tell the server which bank to route to.

| | |
|---|---|
| **Pros** | Single retain call; explicit routing; client has full control |
| **Cons** | Requires the client to classify content before sending — the client would need to either ask the LLM to tag content, or use heuristics; adds client-side complexity; classification happens before extraction (less context available); requires server support for tag-based routing |

### My Recommendation

**Dual-write** is the pragmatic choice. It:
- Works with the existing API (no server changes)
- Leverages `retainMission` which already exists for exactly this purpose
- The cost of two `async: true` retain calls is minimal
- Each bank's mission naturally filters — a user-bank mission like "Extract only personal preferences and habits" will simply ignore project architecture in the transcript

---

## Recall Strategy: Pros/Cons

### Option 1: Merge both (my recommendation)

Query both banks in parallel, combine results into a single memory block presented to the model.

| | |
|---|---|
| **Pros** | Simplest mental model; the LLM gets full context; no risk of missing relevant memories from either scope; parallel queries don't add latency |
| **Cons** | Combined results may exceed token budget — need to split budget (e.g., 60% project / 40% user); relevance ranking is per-bank so cross-bank ranking isn't optimal; slightly more tokens used in context |

### Option 2: Query selectively

Analyze the recall query and decide which bank to hit (or both).

| | |
|---|---|
| **Pros** | Most token-efficient; targeted queries get better signal-to-noise; avoids irrelevant memories from the wrong scope |
| **Cons** | Requires a classification step (LLM call or heuristic) before recall; errors in classification mean missed memories; added latency from the classification step; complexity in the client |

### Option 3: Always both, separate sections

Query both but present results with clear labels ("From your personal preferences:" / "From project context:").

| | |
|---|---|
| **Pros** | Full context available; the LLM can reason about source/scope of each memory; good for debugging (user can see which bank contributed what); no classification needed |
| **Cons** | Uses more prompt space for section headers; token budget split issue same as Option 1; slightly more complex formatting logic |

### My Recommendation

**Option 3 (both, separate sections)** is a small extension of Option 1 that adds useful transparency. The LLM benefits from knowing whether a memory is a personal preference vs. a project convention — it can weigh them differently. The formatting overhead is negligible (two short headers).

---

Shall I proceed with a concrete implementation plan based on:
- **Dual-write** for retain
- **Both banks, separate sections** for recall
- **HINDSIGHT_USER_ID with OS username fallback** for user bank identity

Or would you like to adjust any of these choices?

---

## User

Yes, create a concrete implementation plan using your proposed options.

---

## Assistant (Plan · Claude Opus 4.6 · 6.5s)

_Thinking:_

The user wants a concrete implementation plan. I'm in plan mode so I can only read/search and produce a plan. Let me look at the relevant files to understand what needs to change, then produce a detailed plan.

Let me review the current implementation details to build a precise plan.

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/index.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/index.ts</path>
<type>file</type>
<content>
1: /**
2:  * Hindsight OpenCode Plugin — persistent long-term memory for OpenCode agents.
3:  *
4:  * Provides:
5:  *   - Custom tools: hindsight_retain, hindsight_recall, hindsight_reflect
6:  *   - Auto-retain on session.idle
7:  *   - Memory injection on session.created via system transform
8:  *   - Memory preservation during context compaction
9:  *
10:  * @example
11:  * ```json
12:  * // opencode.json
13:  * { "plugin": ["@vectorize-io/opencode-hindsight"] }
14:  *
15:  * // With options:
16:  * { "plugin": [["@vectorize-io/opencode-hindsight", { "bankId": "my-bank" }]] }
17:  * ```
18:  */
19: 
20: import type { Plugin } from "@opencode-ai/plugin";
21: import { HindsightClient } from "@vectorize-io/hindsight-client";
22: import { loadConfig } from "./config.js";
23: import { deriveBankId } from "./bank.js";
24: import { createTools } from "./tools.js";
25: import { createHooks, type PluginState } from "./hooks.js";
26: import { debugLog } from "./config.js";
27: 
28: // Module-level state persists across sessions (plugin is instantiated per session,
29: // but the module is loaded once per OpenCode server process).
30: const state: PluginState = {
31:   turnCount: 0,
32:   missionsSet: new Set(),
33:   recalledSessions: new Set(),
34:   lastRetainedTurn: new Map(),
35: };
36: 
37: const HindsightPlugin: Plugin = async (input, options) => {
38:   const config = loadConfig(options);
39: 
40:   const apiUrl = config.hindsightApiUrl;
41:   if (!apiUrl) {
42:     console.error(
43:       "[Hindsight] No API URL configured. Set HINDSIGHT_API_URL environment variable " +
44:         "or add hindsightApiUrl to ~/.hindsight/opencode.json"
45:     );
46:     // Return empty hooks — graceful degradation
47:     return {};
48:   }
49: 
50:   const client = new HindsightClient({
51:     baseUrl: apiUrl,
52:     apiKey: config.hindsightApiToken || undefined,
53:   });
54: 
55:   const bankId = deriveBankId(config, input.directory);
56:   debugLog(config, `Initialized with bank: ${bankId}, API: ${apiUrl}`);
57: 
58:   const tools = createTools(client, bankId, config, state.missionsSet);
59:   const hooks = createHooks(
60:     client,
61:     bankId,
62:     config,
63:     state,
64:     input.client as unknown as Parameters<typeof createHooks>[4]
65:   );
66: 
67:   return {
68:     tool: tools,
69:     ...hooks,
70:   };
71: };
72: 
73: // Named export for direct import
74: export { HindsightPlugin };
75: 
76: // Default export is the Plugin function itself — OpenCode's loader calls the
77: // default export directly.
78: export default HindsightPlugin;
79: 
80: // Re-export types for consumers
81: export type { HindsightConfig } from "./config.js";
82: export type { PluginState } from "./hooks.js";
83: export { loadConfig } from "./config.js";
84: export { deriveBankId } from "./bank.js";

(End of file - total 84 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/hooks.ts</path>
<type>file</type>
<content>
1: /**
2:  * Hook implementations for the Hindsight OpenCode plugin.
3:  *
4:  * Hooks:
5:  *   - event (session.created) → recall memories and inject into system prompt
6:  *   - event (session.idle) → auto-retain conversation transcript
7:  *   - experimental.session.compacting → inject memories into compaction context
8:  */
9: 
10: import type { HindsightClient } from "@vectorize-io/hindsight-client";
11: import type { HindsightConfig } from "./config.js";
12: import { debugLog } from "./config.js";
13: import {
14:   formatMemories,
15:   formatCurrentTime,
16:   stripMemoryTags,
17:   composeRecallQuery,
18:   truncateRecallQuery,
19:   prepareRetentionTranscript,
20:   sliceLastTurnsByUserBoundary,
21:   type Message,
22: } from "./content.js";
23: import { ensureBankMission } from "./bank.js";
24: 
25: export interface PluginState {
26:   turnCount: number;
27:   missionsSet: Set<string>;
28:   /** Track sessions we've already injected recall into */
29:   recalledSessions: Set<string>;
30:   /** Track last retained turn count per session to avoid duplicates */
31:   lastRetainedTurn: Map<string, number>;
32: }
33: 
34: interface EventInput {
35:   event: {
36:     type: string;
37:     properties: Record<string, unknown>;
38:   };
39: }
40: 
41: interface CompactingInput {
42:   sessionID: string;
43: }
44: 
45: interface CompactingOutput {
46:   context: string[];
47:   prompt?: string;
48: }
49: 
50: interface SystemTransformInput {
51:   sessionID?: string;
52:   model: unknown;
53: }
54: 
55: interface SystemTransformOutput {
56:   system: string[];
57: }
58: 
59: type OpencodeClient = {
60:   session: {
61:     messages: (params: { path: { id: string } }) => Promise<{
62:       data?: Array<{
63:         info: { role: string };
64:         parts: Array<{ type: string; text?: string }>;
65:       }>;
66:       error?: unknown;
67:       request?: unknown;
68:       response?: unknown;
69:     }>;
70:   };
71: };
72: 
73: export interface HindsightHooks {
74:   event: (input: EventInput) => Promise<void>;
75:   "experimental.session.compacting": (
76:     input: CompactingInput,
77:     output: CompactingOutput
78:   ) => Promise<void>;
79:   "experimental.chat.system.transform": (
80:     input: SystemTransformInput,
81:     output: SystemTransformOutput
82:   ) => Promise<void>;
83: }
84: 
85: export function createHooks(
86:   hindsightClient: HindsightClient,
87:   bankId: string,
88:   config: HindsightConfig,
89:   state: PluginState,
90:   opencodeClient: OpencodeClient
91: ): HindsightHooks {
92:   interface RecallOutcome {
93:     /** formatted context string, or null if no results */
94:     context: string | null;
95:     /** true if the API call succeeded (even with 0 results) */
96:     ok: boolean;
97:   }
98: 
99:   /** Recall memories and format as context string */
100:   async function recallForContext(query: string): Promise<RecallOutcome> {
101:     try {
102:       const response = await hindsightClient.recall(bankId, query, {
103:         budget: config.recallBudget as "low" | "mid" | "high",
104:         maxTokens: config.recallMaxTokens,
105:         types: config.recallTypes,
106:         tags: config.recallTags.length ? config.recallTags : undefined,
107:         tagsMatch: config.recallTags.length ? config.recallTagsMatch : undefined,
108:       });
109: 
110:       const results = response.results || [];
111:       if (!results.length) return { context: null, ok: true };
112: 
113:       const formatted = formatMemories(results);
114:       const context =
115:         `<hindsight_memories>\n` +
116:         `${config.recallPromptPreamble}\n` +
117:         `Current time: ${formatCurrentTime()} UTC\n\n` +
118:         `${formatted}\n` +
119:         `</hindsight_memories>`;
120:       return { context, ok: true };
121:     } catch (e) {
122:       debugLog(config, "Recall failed:", e);
123:       return { context: null, ok: false };
124:     }
125:   }
126: 
127:   /** Extract plain-text messages from an OpenCode session */
128:   async function getSessionMessages(sessionId: string): Promise<Message[]> {
129:     try {
130:       debugLog(config, `getSessionMessages: fetching messages for session ${sessionId}`);
131:       const response = await opencodeClient.session.messages({
132:         path: { id: sessionId },
133:       });
134:       if (response.error) {
135:         debugLog(
136:           config,
137:           `getSessionMessages: error=${JSON.stringify(response.error)?.substring(0, 500)}`
138:         );
139:       }
140:       const rawMessages = response.data || [];
141:       const messages: Message[] = [];
142:       for (const msg of rawMessages) {
143:         const role = msg.info.role;
144:         if (role !== "user" && role !== "assistant") continue;
145:         const textParts = msg.parts.filter((p) => p.type === "text" && p.text).map((p) => p.text!);
146:         if (textParts.length) {
147:           messages.push({ role, content: textParts.join("\n") });
148:         }
149:       }
150:       debugLog(config, `getSessionMessages: raw=${rawMessages.length}, parsed=${messages.length}`);
151:       return messages;
152:     } catch (e) {
153:       debugLog(config, "Failed to get session messages:", e);
154:       return [];
155:     }
156:   }
157: 
158:   /**
159:    * Retain messages for a session, respecting retainMode and documentId semantics.
160:    * Used by both idle-retain and pre-compaction retain.
161:    */
162:   async function retainSession(sessionId: string, messages: Message[]): Promise<void> {
163:     const retainFullWindow = config.retainMode === "full-session";
164:     let targetMessages: Message[];
165:     let documentId: string;
166: 
167:     if (retainFullWindow) {
168:       targetMessages = messages;
169:       // Full-session upserts the same document each time
170:       documentId = sessionId;
171:     } else {
172:       // Sliding window: retainEveryNTurns + overlap
173:       const windowTurns = config.retainEveryNTurns + config.retainOverlapTurns;
174:       targetMessages = sliceLastTurnsByUserBoundary(messages, windowTurns);
175:       // Chunked mode: unique document per chunk
176:       documentId = `${sessionId}-${Date.now()}`;
177:     }
178: 
179:     const { transcript } = prepareRetentionTranscript(targetMessages, true);
180:     if (!transcript) return;
181: 
182:     await ensureBankMission(hindsightClient, bankId, config, state.missionsSet);
183:     await hindsightClient.retain(bankId, transcript, {
184:       documentId,
185:       context: config.retainContext,
186:       tags: config.retainTags.length ? config.retainTags : undefined,
187:       metadata: Object.keys(config.retainMetadata).length
188:         ? { ...config.retainMetadata, session_id: sessionId }
189:         : { session_id: sessionId },
190:       async: true,
191:     });
192:   }
193: 
194:   /** Auto-retain conversation transcript */
195:   async function handleSessionIdle(sessionId: string): Promise<void> {
196:     debugLog(config, `handleSessionIdle called for session ${sessionId}`);
197:     if (!config.autoRetain) return;
198: 
199:     const messages = await getSessionMessages(sessionId);
200:     if (!messages.length) return;
201: 
202:     // Count user turns
203:     const userTurns = messages.filter((m) => m.role === "user").length;
204:     const lastRetained = state.lastRetainedTurn.get(sessionId) || 0;
205:     debugLog(
206:       config,
207:       `handleSessionIdle: userTurns=${userTurns}, lastRetained=${lastRetained}, retainEveryNTurns=${config.retainEveryNTurns}`
208:     );
209: 
210:     // Only retain if enough new turns since last retain
211:     if (userTurns - lastRetained < config.retainEveryNTurns) return;
212: 
213:     try {
214:       await retainSession(sessionId, messages);
215:       state.lastRetainedTurn.set(sessionId, userTurns);
216:       debugLog(config, `Auto-retained ${messages.length} messages for session ${sessionId}`);
217:     } catch (e) {
218:       debugLog(config, "Auto-retain failed:", e);
219:     }
220:   }
221: 
222:   const event = async (input: EventInput): Promise<void> => {
223:     try {
224:       const { event: evt } = input;
225:       debugLog(config, `event hook fired: type=${evt.type}`);
226: 
227:       if (evt.type === "session.idle") {
228:         const sessionId = (evt.properties as { sessionID?: string }).sessionID;
229:         if (sessionId) {
230:           await handleSessionIdle(sessionId);
231:         }
232:       }
233: 
234:       if (evt.type === "session.created") {
235:         const session = evt.properties.info as { id?: string; title?: string } | undefined;
236:         const sessionId = session?.id;
237:         if (sessionId && config.autoRecall && !state.recalledSessions.has(sessionId)) {
238:           state.recalledSessions.add(sessionId);
239:           // Cap tracked sessions
240:           if (state.recalledSessions.size > 1000) {
241:             const first = state.recalledSessions.values().next().value;
242:             if (first) state.recalledSessions.delete(first);
243:           }
244:         }
245:       }
246:     } catch (e) {
247:       debugLog(config, "Event hook error:", e);
248:     }
249:   };
250: 
251:   const compacting = async (input: CompactingInput, output: CompactingOutput): Promise<void> => {
252:     try {
253:       // First, retain what we have before compaction (using shared retention logic)
254:       const messages = await getSessionMessages(input.sessionID);
255:       if (messages.length && config.autoRetain) {
256:         try {
257:           await retainSession(input.sessionID, messages);
258:           // Reset turn tracking — after compaction the message list shrinks,
259:           // so the old lastRetainedTurn value would block future idle retains.
260:           state.lastRetainedTurn.delete(input.sessionID);
261:           debugLog(config, "Pre-compaction retain completed");
262:         } catch (e) {
263:           debugLog(config, "Pre-compaction retain failed:", e);
264:         }
265:       }
266: 
267:       // Then recall relevant memories to inject into compaction context
268:       if (messages.length) {
269:         const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
270:         if (lastUserMsg) {
271:           const query = composeRecallQuery(
272:             lastUserMsg.content,
273:             messages,
274:             config.recallContextTurns
275:           );
276:           const truncated = truncateRecallQuery(
277:             query,
278:             lastUserMsg.content,
279:             config.recallMaxQueryChars
280:           );
281:           const { context } = await recallForContext(truncated);
282:           if (context) {
283:             output.context.push(context);
284:           }
285:         }
286:       }
287:     } catch (e) {
288:       debugLog(config, "Compaction hook error:", e);
289:     }
290:   };
291: 
292:   const systemTransform = async (
293:     input: SystemTransformInput,
294:     output: SystemTransformOutput
295:   ): Promise<void> => {
296:     try {
297:       if (!config.autoRecall) return;
298:       const sessionId = input.sessionID;
299:       if (!sessionId) return;
300: 
301:       // Only inject on first message of a session (tracked by recalledSessions)
302:       if (!state.recalledSessions.has(sessionId)) return;
303: 
304:       await ensureBankMission(hindsightClient, bankId, config, state.missionsSet);
305: 
306:       // Use a generic project-context query for session start
307:       const query = `project context and recent work`;
308:       const { context, ok } = await recallForContext(query);
309: 
310:       // Consume after a successful API round-trip (even with 0 results).
311:       // Only preserve retry for transient API failures (ok=false).
312:       if (ok) {
313:         state.recalledSessions.delete(sessionId);
314:       }
315: 
316:       if (context) {
317:         output.system.push(context);
318:         debugLog(config, `Injected recall context for session ${sessionId}`);
319:       }
320:     } catch (e) {
321:       debugLog(config, "System transform hook error:", e);
322:     }
323:   };
324: 
325:   return {
326:     event,
327:     "experimental.session.compacting": compacting,
328:     "experimental.chat.system.transform": systemTransform,
329:   };
330: }

(End of file - total 330 lines)
</content>
```

---

## Assistant (Plan · Claude Opus 4.6 · 5.2s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts",
  "limit": 30
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/tools.ts</path>
<type>file</type>
<content>
1: /**
2:  * Custom tool definitions for the Hindsight OpenCode plugin.
3:  *
4:  * Registers hindsight_retain, hindsight_recall, and hindsight_reflect
5:  * as tools the agent can call explicitly.
6:  */
7: 
8: import { tool } from "@opencode-ai/plugin/tool";
9: import type { ToolDefinition } from "@opencode-ai/plugin/tool";
10: import type { HindsightClient } from "@vectorize-io/hindsight-client";
11: import type { HindsightConfig } from "./config.js";
12: import { formatMemories, formatCurrentTime } from "./content.js";
13: import { ensureBankMission } from "./bank.js";
14: 
15: export interface HindsightTools {
16:   hindsight_retain: ToolDefinition;
17:   hindsight_recall: ToolDefinition;
18:   hindsight_reflect: ToolDefinition;
19: }
20: 
21: export function createTools(
22:   client: HindsightClient,
23:   bankId: string,
24:   config: HindsightConfig,
25:   missionsSet?: Set<string>
26: ): HindsightTools {
27:   const hindsight_retain = tool({
28:     description:
29:       "Store information in long-term memory. Use this to remember important facts, " +
30:       "user preferences, project context, decisions, and anything worth recalling in future sessions. " +

(Showing lines 1-30 of 107. Use offset=31 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.test.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/bank.test.ts</path>
<type>file</type>
<content>
1: import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
2: import { deriveBankId, ensureBankMission } from "./bank.js";
3: import { makeConfig } from "./test-helpers.js";
4: 
5: describe("deriveBankId", () => {
6:   const originalEnv = { ...process.env };
7: 
8:   afterEach(() => {
9:     process.env = { ...originalEnv };
10:   });
11: 
12:   it("returns default bank name in static mode", () => {
13:     expect(deriveBankId(makeConfig(), "/home/user/project")).toBe("opencode");
14:   });
15: 
16:   it("returns configured bankId in static mode", () => {
17:     const config = makeConfig({ bankId: "my-bank" });
18:     expect(deriveBankId(config, "/home/user/project")).toBe("my-bank");
19:   });
20: 
21:   it("adds prefix in static mode", () => {
22:     const config = makeConfig({ bankIdPrefix: "dev", bankId: "my-bank" });
23:     expect(deriveBankId(config, "/home/user/project")).toBe("dev-my-bank");
24:   });
25: 
26:   it("composes from granularity fields in dynamic mode", () => {
27:     const config = makeConfig({
28:       dynamicBankId: true,
29:       dynamicBankGranularity: ["agent", "project"],
30:       agentName: "opencode",
31:     });
32:     expect(deriveBankId(config, "/home/user/my-project")).toBe("opencode::my-project");
33:   });
34: 
35:   it("uses default granularity when not specified", () => {
36:     const config = makeConfig({
37:       dynamicBankId: true,
38:       dynamicBankGranularity: [],
39:     });
40:     expect(deriveBankId(config, "/home/user/proj")).toBe("opencode::proj");
41:   });
42: 
43:   it("preserves raw special characters", () => {
44:     const config = makeConfig({
45:       dynamicBankId: true,
46:       dynamicBankGranularity: ["project"],
47:     });
48:     expect(deriveBankId(config, "/home/user/my project")).toBe("my project");
49:   });
50: 
51:   it("preserves raw UTF-8 characters", () => {
52:     const config = makeConfig({
53:       dynamicBankId: true,
54:       dynamicBankGranularity: ["project"],
55:     });
56:     expect(deriveBankId(config, "/home/user/мой проект")).toBe("мой проект");
57:   });
58: 
59:   it("uses channel/user from env vars", () => {
60:     process.env.HINDSIGHT_CHANNEL_ID = "slack-general";
61:     process.env.HINDSIGHT_USER_ID = "user123";
62:     const config = makeConfig({
63:       dynamicBankId: true,
64:       dynamicBankGranularity: ["agent", "channel", "user"],
65:     });
66:     expect(deriveBankId(config, "/home/user/proj")).toBe("opencode::slack-general::user123");
67:   });
68: 
69:   it("uses defaults for missing env vars", () => {
70:     delete process.env.HINDSIGHT_CHANNEL_ID;
71:     delete process.env.HINDSIGHT_USER_ID;
72:     const config = makeConfig({
73:       dynamicBankId: true,
74:       dynamicBankGranularity: ["channel", "user"],
75:     });
76:     expect(deriveBankId(config, "/home/user/proj")).toBe("default::anonymous");
77:   });
78: 
79:   it("adds prefix in dynamic mode", () => {
80:     const config = makeConfig({
81:       dynamicBankId: true,
82:       bankIdPrefix: "dev",
83:       dynamicBankGranularity: ["agent"],
84:     });
85:     expect(deriveBankId(config, "/home/user/proj")).toBe("dev-opencode");
86:   });
87: });
88: 
89: describe("ensureBankMission", () => {
90:   it("calls createBank on first use", async () => {
91:     const client = { createBank: vi.fn().mockResolvedValue({}) } as any;
92:     const missionsSet = new Set<string>();
93:     const config = makeConfig({ bankMission: "Test mission" });
94: 
95:     await ensureBankMission(client, "test-bank", config, missionsSet);
96: 
97:     expect(client.createBank).toHaveBeenCalledWith("test-bank", {
98:       reflectMission: "Test mission",
99:       retainMission: undefined,
100:     });
101:     expect(missionsSet.has("test-bank")).toBe(true);
102:   });
103: 
104:   it("skips if already set", async () => {
105:     const client = { createBank: vi.fn() } as any;
106:     const missionsSet = new Set(["test-bank"]);
107:     const config = makeConfig({ bankMission: "Test mission" });
108: 
109:     await ensureBankMission(client, "test-bank", config, missionsSet);
110: 
111:     expect(client.createBank).not.toHaveBeenCalled();
112:   });
113: 
114:   it("skips if no mission configured", async () => {
115:     const client = { createBank: vi.fn() } as any;
116:     const missionsSet = new Set<string>();
117:     const config = makeConfig({ bankMission: "" });
118: 
119:     await ensureBankMission(client, "test-bank", config, missionsSet);
120: 
121:     expect(client.createBank).not.toHaveBeenCalled();
122:   });
123: 
124:   it("does not throw on client error", async () => {
125:     const client = { createBank: vi.fn().mockRejectedValue(new Error("Network error")) } as any;
126:     const missionsSet = new Set<string>();
127:     const config = makeConfig({ bankMission: "Mission" });
128: 
129:     await expect(
130:       ensureBankMission(client, "test-bank", config, missionsSet)
131:     ).resolves.not.toThrow();
132:     expect(missionsSet.has("test-bank")).toBe(false);
133:   });
134: 
135:   it("passes retainMission when configured", async () => {
136:     const client = { createBank: vi.fn().mockResolvedValue({}) } as any;
137:     const missionsSet = new Set<string>();
138:     const config = makeConfig({ bankMission: "Reflect", retainMission: "Extract carefully" });
139: 
140:     await ensureBankMission(client, "test-bank", config, missionsSet);
141: 
142:     expect(client.createBank).toHaveBeenCalledWith("test-bank", {
143:       reflectMission: "Reflect",
144:       retainMission: "Extract carefully",
145:     });
146:   });
147: });

(End of file - total 147 lines)
</content>
```

---

## Assistant (Plan · Claude Opus 4.6 · 3.6s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/test-helpers.ts"
}
```

**Output:**
```
<path>/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/src/test-helpers.ts</path>
<type>file</type>
<content>
1: import type { HindsightConfig } from "./config.js";
2: 
3: export function makeConfig(overrides: Partial<HindsightConfig> = {}): HindsightConfig {
4:   return {
5:     autoRecall: true,
6:     recallBudget: "mid",
7:     recallMaxTokens: 1024,
8:     recallTypes: ["world", "experience"],
9:     recallContextTurns: 1,
10:     recallMaxQueryChars: 800,
11:     recallPromptPreamble: "",
12:     recallTags: [],
13:     recallTagsMatch: "any",
14:     autoRetain: true,
15:     retainMode: "full-session",
16:     retainEveryNTurns: 3,
17:     retainOverlapTurns: 2,
18:     retainContext: "opencode",
19:     retainTags: [],
20:     retainMetadata: {},
21:     hindsightApiUrl: null,
22:     hindsightApiToken: null,
23:     bankId: null,
24:     bankIdPrefix: "",
25:     dynamicBankId: false,
26:     dynamicBankGranularity: ["agent", "project"],
27:     bankMission: "",
28:     retainMission: null,
29:     agentName: "opencode",
30:     debug: false,
31:     ...overrides,
32:   };
33: }

(End of file - total 33 lines)
</content>
```

---

## Assistant (Plan · Claude Opus 4.6 · 37.7s)

Now I have a complete picture. Here's the implementation plan:

---

## Implementation Plan: Dual-Bank (User + Project) Architecture

### Design Summary

| Aspect | Decision |
|--------|----------|
| **Retain** | Dual-write — same transcript sent to both banks; each bank's mission filters what it extracts |
| **Recall** | Both banks queried in parallel, results presented in labeled sections |
| **User bank ID** | `HINDSIGHT_USER_ID` env var, falling back to OS username (`os.userInfo().username`) |

### New Config Fields

Added to `HindsightConfig`:

```typescript
// Bank — multi-bank
multiBankEnabled: boolean;              // Enable dual user+project banks (env: HINDSIGHT_MULTI_BANK)
userBankId: string | null;              // Explicit user bank override (env: HINDSIGHT_USER_BANK_ID)
userBankMission: string;                // Reflect mission for user bank
userRetainMission: string | null;       // Retain mission for user bank
```

Defaults:
- `multiBankEnabled: false` (opt-in, backward compatible)
- `userBankId: null` (derived automatically)
- `userBankMission: "Track personal coding preferences, workflow habits, tool configurations, and communication style. Ignore project-specific details."`
- `userRetainMission: "Extract only personal preferences, habits, and user-specific knowledge. Ignore project architecture, codebase conventions, and technical decisions tied to a specific project."`

When `multiBankEnabled: true`, the existing `bankMission` / `retainMission` become the **project bank** missions (with sensible defaults if empty).

---

### File-by-File Changes

#### 1. `src/config.ts`

- Add new fields to `HindsightConfig` interface
- Add defaults for new fields
- Add env var mappings: `HINDSIGHT_MULTI_BANK` → `multiBankEnabled` (bool), `HINDSIGHT_USER_BANK_ID` → `userBankId` (string), `HINDSIGHT_USER_BANK_MISSION` → `userBankMission` (string)

#### 2. `src/bank.ts`

- Add `deriveUserBankId(config: HindsightConfig): string` function:
  - If `config.userBankId` is set, use it (with optional prefix)
  - Else use `process.env.HINDSIGHT_USER_ID || os.userInfo().username`
  - Format: `"user::<identifier>"` (e.g., `"user::mas"`)
- Refactor `ensureBankMission` to also accept a mission/retainMission pair as parameters (or add `ensureUserBankMission` variant that reads from `config.userBankMission` / `config.userRetainMission`)
- Add `ensureBankMissions(client, projectBankId, userBankId, config, missionsSet)` convenience that ensures both

#### 3. `src/index.ts`

- Derive both `projectBankId` and `userBankId` when `multiBankEnabled`
- Pass both to `createTools` and `createHooks`
- When `multiBankEnabled: false`, behavior is unchanged (single bank as today)

#### 4. `src/tools.ts`

- Update `createTools` signature to accept `bankIds: { project: string; user: string | null }`
- **`hindsight_retain`**: When multi-bank enabled, call `client.retain()` on both banks in parallel (with `async: true`)
- **`hindsight_recall`**: When multi-bank enabled, query both banks in parallel, format results as:
  ```
  ## From project context:
  <memories>

  ## From personal preferences:
  <memories>
  ```
- **`hindsight_reflect`**: Reflect against the project bank by default; add optional `scope` arg (`"project"` | `"user"` | `"both"`) so the agent can choose

#### 5. `src/hooks.ts`

- Update `createHooks` signature to accept both bank IDs
- **`retainSession`**: Dual-write — call `client.retain()` on both banks in parallel with their respective missions already configured
- **`recallForContext` (system transform + compacting)**: Query both banks in parallel, merge into a single `<hindsight_memories>` block with labeled subsections
- **`ensureBankMission` calls**: Ensure missions for both banks before first operation

#### 6. `src/test-helpers.ts`

- Add new default fields to `makeConfig`

#### 7. `src/bank.test.ts`

- Add tests for `deriveUserBankId`
- Add tests for `ensureBankMission` with user bank variant
- Test fallback from env var to OS username

#### 8. `src/tools.test.ts` / `src/hooks.test.ts` (if they exist)

- Add test cases for dual-write retain behavior
- Add test cases for merged recall output
- Test that when `multiBankEnabled: false`, behavior is identical to current

---

### Backward Compatibility

- Default `multiBankEnabled: false` means zero change for existing users
- All existing config fields retain their meaning (they become "project bank" config)
- The `bankId` / `deriveBankId` logic is untouched — it continues to produce the project bank ID
- When enabled, the only visible change is: dual retain calls, richer recall output with sections

---

### Token Budget Strategy for Recall

When querying both banks, the `recallMaxTokens` budget is split:
- **Project bank**: 60% of `recallMaxTokens`
- **User bank**: 40% of `recallMaxTokens`

This is a sensible default because project context is typically more immediately relevant. Could be made configurable later via `recallUserBudgetRatio` if needed.

---

### Example Resulting Bank IDs

Given config `agentName: "opencode"`, directory `/home/mas/work/hindsight`, user `mas`:

| Mode | Project bank ID | User bank ID |
|------|----------------|--------------|
| Static (default) | `opencode` | `user::mas` |
| Static with bankId | `my-project` | `user::mas` |
| Dynamic | `opencode::hindsight` | `user::mas` |
| With prefix "dev" | `dev-opencode::hindsight` | `dev-user::mas` |

---

Shall I proceed with implementing this plan?

---

## User

Write that plan into a markdown file in directory @docs/ 

---

## Assistant (Build · Claude Opus 4.6 · 25.1s)

**Tool: write**

**Input:**
```json
{
  "filePath": "/home/mas/work/vectorize-io/hindsight/hindsight-integrations/opencode/docs/dual-bank-implementation-plan.md",
  "content": "# Dual-Bank Implementation Plan: User + Project Separation\n\n## Motivation\n\nThe current single-bank model conflates two fundamentally different scopes:\n\n- **User memories** — personal preferences, coding style, tool choices, workflow habits. Portable across projects.\n- **Project memories** — architecture decisions, codebase conventions, dependency choices, debugging history. Tied to a specific codebase.\n\nSeparating them enables reuse of personal preferences across projects and cleaner signal-to-noise in recall results.\n\n## Design Decisions\n\n| Aspect | Decision | Rationale |\n|--------|----------|-----------|\n| **Retain** | Dual-write — same transcript sent to both banks | Works with existing API; each bank's `retainMission` filters what it extracts; no server changes needed |\n| **Recall** | Both banks queried in parallel, results in labeled sections | Full context available; LLM can reason about source/scope; no classification step needed |\n| **User bank ID** | `HINDSIGHT_USER_ID` env var, falling back to OS username | Zero-config on single-user machines; explicit override when needed |\n\n## New Config Fields\n\nAdded to `HindsightConfig`:\n\n```typescript\n// Bank — multi-bank\nmultiBankEnabled: boolean;         // Enable dual user+project banks (env: HINDSIGHT_MULTI_BANK)\nuserBankId: string | null;         // Explicit user bank override (env: HINDSIGHT_USER_BANK_ID)\nuserBankMission: string;           // Reflect mission for user bank\nuserRetainMission: string | null;  // Retain mission for user bank\n```\n\n### Defaults\n\n| Field | Default |\n|-------|---------|\n| `multiBankEnabled` | `false` (opt-in, backward compatible) |\n| `userBankId` | `null` (derived automatically) |\n| `userBankMission` | `\"Track personal coding preferences, workflow habits, tool configurations, and communication style. Ignore project-specific details.\"` |\n| `userRetainMission` | `\"Extract only personal preferences, habits, and user-specific knowledge. Ignore project architecture, codebase conventions, and technical decisions tied to a specific project.\"` |\n\nWhen `multiBankEnabled: true`, the existing `bankMission` / `retainMission` become the **project bank** missions.\n\n## File-by-File Changes\n\n### 1. `src/config.ts`\n\n- Add new fields to `HindsightConfig` interface\n- Add defaults for new fields\n- Add env var mappings:\n  - `HINDSIGHT_MULTI_BANK` → `multiBankEnabled` (bool)\n  - `HINDSIGHT_USER_BANK_ID` → `userBankId` (string)\n  - `HINDSIGHT_USER_BANK_MISSION` → `userBankMission` (string)\n\n### 2. `src/bank.ts`\n\n- Add `deriveUserBankId(config: HindsightConfig): string`:\n  - If `config.userBankId` is set, use it (with optional prefix)\n  - Else use `process.env.HINDSIGHT_USER_ID || os.userInfo().username`\n  - Format: `\"user::<identifier>\"` (e.g., `\"user::mas\"`)\n- Refactor `ensureBankMission` to accept mission/retainMission as parameters (or add a variant for user bank that reads from `config.userBankMission` / `config.userRetainMission`)\n- Add `ensureBankMissions(client, projectBankId, userBankId, config, missionsSet)` convenience that ensures both\n\n### 3. `src/index.ts`\n\n- Derive both `projectBankId` and `userBankId` when `multiBankEnabled`\n- Pass both to `createTools` and `createHooks`\n- When `multiBankEnabled: false`, behavior is unchanged (single bank as today)\n\n### 4. `src/tools.ts`\n\n- Update `createTools` signature to accept `bankIds: { project: string; user: string | null }`\n- **`hindsight_retain`**: When multi-bank enabled, call `client.retain()` on both banks in parallel (with `async: true`)\n- **`hindsight_recall`**: When multi-bank enabled, query both banks in parallel, format results as:\n  ```\n  ## From project context:\n  <memories>\n\n  ## From personal preferences:\n  <memories>\n  ```\n- **`hindsight_reflect`**: Reflect against the project bank by default; add optional `scope` arg (`\"project\"` | `\"user\"` | `\"both\"`) so the agent can choose\n\n### 5. `src/hooks.ts`\n\n- Update `createHooks` signature to accept both bank IDs\n- **`retainSession`**: Dual-write — call `client.retain()` on both banks in parallel with their respective missions already configured\n- **`recallForContext` (system transform + compacting)**: Query both banks in parallel, merge into a single `<hindsight_memories>` block with labeled subsections\n- **`ensureBankMission` calls**: Ensure missions for both banks before first operation\n\n### 6. `src/test-helpers.ts`\n\n- Add new default fields to `makeConfig`\n\n### 7. `src/bank.test.ts`\n\n- Add tests for `deriveUserBankId`\n- Add tests for `ensureBankMission` with user bank variant\n- Test fallback from env var to OS username\n\n### 8. `src/tools.test.ts` / `src/hooks.test.ts`\n\n- Add test cases for dual-write retain behavior\n- Add test cases for merged recall output with sections\n- Test that when `multiBankEnabled: false`, behavior is identical to current\n\n## Backward Compatibility\n\n- Default `multiBankEnabled: false` means zero change for existing users\n- All existing config fields retain their meaning (they become \"project bank\" config)\n- The `bankId` / `deriveBankId` logic is untouched — it continues to produce the project bank ID\n- When enabled, the only visible changes are: dual retain calls and richer recall output with sections\n\n## Token Budget Strategy for Recall\n\nWhen querying both banks, the `recallMaxTokens` budget is split:\n\n| Bank | Share | Rationale |\n|------|-------|-----------|\n| Project bank | 60% | Project context is typically more immediately relevant |\n| User bank | 40% | Personal preferences provide supporting context |\n\nCould be made configurable later via `recallUserBudgetRatio` if needed.\n\n## Example Resulting Bank IDs\n\nGiven config `agentName: \"opencode\"`, directory `/home/mas/work/hindsight`, user `mas`:\n\n| Mode | Project bank ID | User bank ID |\n|------|----------------|--------------|\n| Static (default) | `opencode` | `user::mas` |\n| Static with bankId | `my-project` | `user::mas` |\n| Dynamic | `opencode::hindsight` | `user::mas` |\n| With prefix \"dev\" | `dev-opencode::hindsight` | `dev-user::mas` |\n\n## Configuration Examples\n\n### Minimal (env vars only)\n\n```bash\nexport HINDSIGHT_MULTI_BANK=true\n# User bank ID auto-derived from OS username\n```\n\n### Full (`~/.hindsight/opencode.json`)\n\n```json\n{\n  \"multiBankEnabled\": true,\n  \"userBankId\": \"mas\",\n  \"userBankMission\": \"Track my coding preferences, IDE setup, and workflow habits.\",\n  \"userRetainMission\": \"Extract personal preferences and habits only.\",\n  \"bankMission\": \"Track architecture decisions and codebase conventions for this project.\",\n  \"retainMission\": \"Extract project-specific technical decisions and patterns.\"\n}\n```\n\n### Plugin options (`opencode.json`)\n\n```json\n{\n  \"plugin\": [\n    [\"@vectorize-io/opencode-hindsight\", {\n      \"multiBankEnabled\": true,\n      \"bankMission\": \"Focus on API contracts and deployment patterns.\"\n    }]\n  ]\n}\n```\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · Claude Opus 4.6 · 4.4s)

Written to `docs/dual-bank-implementation-plan.md`. The file covers the full implementation plan including motivation, design decisions, file-by-file changes, backward compatibility guarantees, token budget strategy, bank ID examples, and configuration examples.

---

