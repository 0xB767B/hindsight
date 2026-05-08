# Dual-Bank Implementation Plan: User + Project Separation

## Motivation

The current single-bank model conflates two fundamentally different scopes:

- **User memories** — personal preferences, coding style, tool choices, workflow habits. Portable across projects.
- **Project memories** — architecture decisions, codebase conventions, dependency choices, debugging history. Tied to a specific codebase.

Separating them enables reuse of personal preferences across projects and cleaner signal-to-noise in recall results.

## Design Decisions

| Aspect           | Decision                                                                 | Rationale                                                                                                                      |
|------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| **Retain**       | Dual-write — same transcript sent to both banks                          | Works with existing API; each bank's `retainMission` filters what it extracts; no server changes needed                        |
| **Recall**       | Both banks queried in parallel, results in labeled sections              | Full context available; LLM can reason about source/scope; no classification step needed                                       |
| **Reflect**      | `scope` param: `"project"` (default) or `"user"` — no `"both"` option    | Reflect produces a synthesized narrative server-side; merging two is architecturally awkward. Recall handles dual-bank reads.  |
| **User bank ID** | Domain-namespaced: `coding::user::<id>` from `HINDSIGHT_USER_ID` env var or OS username | Avoids collisions with non-coding apps using hindsight; "coding" domain allows sharing across coding agents while staying isolated from unrelated applications |
| **Project bank ID** | Domain-namespaced: `coding::project::<name>` derived from git project or directory | Project knowledge is codebase-specific, not agent-specific — all coding agents should share the same project bank for a given repo; mirrors the user bank namespace pattern |
| **Bank failure** | Fail hard if user bank creation fails                                    | Partial dual-bank state is confusing; better to surface the error immediately                                                  |
| **Granularity**  | `dynamicBankGranularity` only applies in single-bank (legacy) mode; dual-bank mode uses `deriveProjectBankId` which always uses git/directory-based project name | The agent dimension is irrelevant when banks are shared across agents; the user dimension is handled by the separate user bank |

## New Config Fields

Added to `HindsightConfig`:

```typescript
// Bank — dual-bank
dualBankEnabled: boolean;          // Enable dual user+project banks (env: HINDSIGHT_DUAL_BANK)
userBankId: string | null;         // Explicit user bank override (env: HINDSIGHT_USER_BANK_ID)
userBankMission: string;           // Bank creation mission for user bank (env: HINDSIGHT_USER_BANK_MISSION)
userRetainMission: string | null;  // Retain mission for user bank (env: HINDSIGHT_USER_RETAIN_MISSION)
```

### Defaults

| Field               | Default                                                                                                                                                                            |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `dualBankEnabled`   | `false` (opt-in, backward compatible)                                                                                                                                              |
| `userBankId`        | `null` (derived automatically)                                                                                                                                                     |
| `userBankMission`   | `"Track personal coding preferences, workflow habits, tool configurations, and communication style. Ignore project-specific details."`                                             |
| `userRetainMission` | `"Extract only personal preferences, habits, and user-specific knowledge. Ignore project architecture, codebase conventions, and technical decisions tied to a specific project."` |

When `dualBankEnabled: true`, the existing `bankMission` / `retainMission` become the **project bank** missions.

### Mission Field Mapping

| Field              | Applies to   | Purpose                                          |
|--------------------|--------------|--------------------------------------------------|
| `bankMission`      | Project bank | Bank creation mission for the project bank       |
| `retainMission`    | Project bank | What to extract during retain for project bank   |
| `userBankMission`  | User bank    | Bank creation mission for the user bank          |
| `userRetainMission`| User bank    | What to extract during retain for user bank      |

During dual-write, the same transcript is sent to both banks via `client.retain()`. Each bank has its own `retainMission` configured (set via `ensureBankMission` at bank creation), so the server-side extraction uses each bank's mission to filter what it keeps — the project bank extracts architecture/codebase facts while the user bank extracts personal preferences, from the same input.

The `ensureBankMission` call is made for both banks before the first operation:
- Project bank: `config.bankMission` + `config.retainMission`
- User bank: `config.userBankMission` + `config.userRetainMission`

Existing fields are not renamed or deprecated — they simply become scoped to the project bank when dual-bank is enabled.

## File-by-File Changes

### 1. `src/config.ts`

- Add new fields to `HindsightConfig` interface
- Add defaults for new fields
- Add env var mappings:
  - `HINDSIGHT_DUAL_BANK` → `dualBankEnabled` (bool)
  - `HINDSIGHT_USER_BANK_ID` → `userBankId` (string)
  - `HINDSIGHT_USER_BANK_MISSION` → `userBankMission` (string)
  - `HINDSIGHT_USER_RETAIN_MISSION` → `userRetainMission` (string)

### 2. `src/bank.ts`

- Add `deriveUserBankId(config: HindsightConfig): string`:
  - If `config.userBankId` is set, use it (with optional prefix)
  - Else use `process.env.HINDSIGHT_USER_ID || os.userInfo().username`
  - Format: `"coding::user::<identifier>"` (e.g., `"coding::user::mas"`)
- Add `deriveProjectBankId(config: HindsightConfig, directory: string): string`:
  - Uses git project name (main worktree basename) with fallback to `basename(directory)`
  - If `config.bankId` is set explicitly, use it as the identifier
  - Format: `"coding::project::<identifier>"` (e.g., `"coding::project::hindsight"`)
  - Only used when `dualBankEnabled: true`; single-bank mode uses existing `deriveBankId`
- Add `bankType: "project" | "user"` parameter to `ensureBankMission`. When `"user"`, read `config.userBankMission` / `config.userRetainMission`; when `"project"` (default), read `config.bankMission` / `config.retainMission` as today.
- Add `ensureBankMissions(client, projectBankId, userBankId, config, missionsSet)` convenience that ensures both (calls `ensureBankMission` twice with appropriate `bankType`)

### 3. `src/index.ts`

- When `dualBankEnabled`:
  - Derive project bank via `deriveProjectBankId(config, directory)` (replaces `deriveBankId`)
  - Derive user bank via `deriveUserBankId(config)`
  - Pass both to `createTools` and `createHooks`
- When `dualBankEnabled: false`:
  - Use existing `deriveBankId(config, directory)` — behavior unchanged (single bank as today)

### 4. `src/tools.ts`

- Update `createTools` signature to accept `bankIds: { project: string; user: string | null }`
- **`hindsight_retain`**: When dual-bank enabled, call `client.retain()` on both banks in parallel (with `async: true`)
- **`hindsight_recall`**: When dual-bank enabled, query both banks in parallel. Apply the token budget split (60% project, 40% user — see Token Budget Strategy section) to `recallMaxTokens` before passing to each call. Format results as:
  ```
  ## From project context:
  <memories>

  ## From personal preferences:
  <memories>
  ```
- **`hindsight_reflect`**: When dual-bank enabled, add optional `scope` arg (`"project"` | `"user"`, default `"project"`). Routes `client.reflect()` to the corresponding bank ID. No `"both"` option — reflect produces a synthesized narrative server-side and merging two is architecturally awkward; use `hindsight_recall` for merged dual-bank reads.

### 5. `src/hooks.ts`

- Update `createHooks` signature to accept `bankIds: { project: string; user: string | null }` (same shape as `createTools`)
- **`retainSession`**: Dual-write — call `client.retain()` on both banks in parallel (missions already configured at bank creation via `ensureBankMission`)
- **`recallForContext` (system transform + compacting)**: Query both banks in parallel with token budget split (60% project, 40% user — see Token Budget Strategy section). Merge into a single `<hindsight_memories>` block with labeled subsections.
- **`ensureBankMission` calls**: Ensure missions for both banks before first operation

### 6. `src/test-helpers.ts`

- Add new default fields to `makeConfig`

### 7. `src/bank.test.ts`

- Add tests for `deriveUserBankId`
- Add tests for `ensureBankMission` with user bank variant
- Test fallback from env var to OS username

### 8. `src/tools.test.ts` / `src/hooks.test.ts`

- Add test cases for dual-write retain behavior
- Add test cases for merged recall output with sections
- Add test cases for reflect with `scope` parameter routing to correct bank
- Test that when `dualBankEnabled: false`, behavior is identical to current

## Backward Compatibility

- Default `dualBankEnabled: false` means zero change for existing users
- All existing config fields retain their meaning (they become "project bank" config)
- The `bankId` / `deriveBankId` logic is untouched in single-bank mode — it continues to produce the bank ID as today (e.g., `opencode::hindsight`)
- When `dualBankEnabled: true`, `deriveProjectBankId` is used instead, producing the `coding::project::` namespace. This is intentionally a different ID format since dual-bank is opt-in and represents a new operational mode.
- When enabled, the only visible changes are: dual retain calls, richer recall output with sections, and a new `scope` parameter on `hindsight_reflect` (defaulting to `"project"`, so existing usage is unaffected)

## Token Budget Strategy for Recall

With a single bank, the full `recallMaxTokens` budget (e.g., 4096) is passed to the API, which controls how many tokens of memory content the server returns. With dual-bank recall, two parallel API calls are made. Passing the full budget to both would return up to 2x the tokens, which bloats the context window (memories are injected into the system prompt) and dilutes relevance with lower-quality results padding each bank's allocation.

The strategy splits the single budget between the two banks so the **total** memory payload stays constant at `recallMaxTokens`:

| Bank         | Share | Rationale                                              |
|--------------|-------|--------------------------------------------------------|
| Project bank | 60%   | Project context is typically more immediately relevant |
| User bank    | 40%   | Personal preferences provide supporting context        |

Could be made configurable later via `recallUserBudgetRatio` if needed.

## Example Resulting Bank IDs

Given directory `/home/mas/work/hindsight`, user `mas`:

| Mode                          | Project bank ID               | User bank ID            |
|-------------------------------|-------------------------------|-------------------------|
| Single-bank (default)         | `opencode::hindsight` (via `deriveBankId`, unchanged) | N/A |
| Dual-bank enabled             | `coding::project::hindsight`  | `coding::user::mas`    |
| Dual-bank with explicit bankId| `coding::project::my-project` | `coding::user::mas`    |
| Dual-bank with prefix "dev"  | `dev-coding::project::hindsight` | `dev-coding::user::mas` |

## Configuration Examples

### Minimal (env vars only)

```bash
export HINDSIGHT_DUAL_BANK=true
# User bank ID auto-derived from OS username
```

### Full (`~/.hindsight/opencode.json` — existing config path, not new)

```json
{
  "dualBankEnabled": true,
  "userBankId": "mas",
  "userBankMission": "Track my coding preferences, IDE setup, and workflow habits.",
  "userRetainMission": "Extract personal preferences and habits only.",
  "bankMission": "Track architecture decisions and codebase conventions for this project.",
  "retainMission": "Extract project-specific technical decisions and patterns."
}
```

### Plugin options (`opencode.json`)

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
  "dualBankEnabled": true,
      "bankMission": "Focus on API contracts and deployment patterns."
    }]
  ]
}
```

## Error Handling

- If user bank creation/mission-set fails, the plugin **fails hard** — no partial dual-bank state.
- This surfaces the error immediately rather than silently degrading to single-bank mode, which would be confusing.
- If `dualBankEnabled: true` but `userBankMission` is empty/unset, treat it as a configuration error and fail at startup. An empty mission would cause `ensureBankMission` to skip bank creation, resulting in silent degradation — which contradicts fail-hard.

## Implementation Order

The following is the authoritative build sequence (differs from the file-by-file grouping above which is organized by logical concern):

1. `src/config.ts` — Add fields + env var mappings
2. `src/test-helpers.ts` — Add defaults to `makeConfig`
3. `src/bank.ts` — Add `deriveUserBankId()`, `deriveProjectBankId()`, add `bankType` param to `ensureBankMission`
4. `src/bank.test.ts` — Tests for user bank derivation, project bank derivation, and mission
5. `src/index.ts` — Derive both IDs, granularity warning, pass both downstream
6. `src/tools.ts` — Dual-write retain, merged recall, reflect with `scope`
7. `src/hooks.ts` — Dual-write `retainSession`, merged `recallForContext`
8. `src/tools.test.ts` + `src/hooks.test.ts` — Dual-bank test cases + backward compat
