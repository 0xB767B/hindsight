# Bank Mission Configuration

This document describes how bank missions are configured in the Hindsight OpenCode integration.

## Overview

A **memory bank** is an isolated container storing memories, documents, entities, relationships, and directives for a specific context. Banks are auto-created on first use with default settings. Missions allow you to steer how the bank extracts and synthesizes information.

## Two Mission Types

The integration supports two distinct missions:

| Mission         | Config key      | Server field     | Purpose                                              |
|-----------------|-----------------|------------------|------------------------------------------------------|
| Reflect mission | `bankMission`   | `reflectMission` | Guides synthesis when answering queries via reflect  |
| Retain mission  | `retainMission` | `retainMission`  | Steers what information gets extracted during retain |

## Configuration Sources

Missions can be set through the standard config loading order (later entries win):

1. **Built-in defaults** — `bankMission: ""`, `retainMission: null`
2. **User config file** (`~/.hindsight/opencode.json`)
3. **Plugin options** (from opencode.json plugin tuple)
4. **Environment variables** (highest priority)

### Environment Variable Support

| Config key      | Env var                  | Notes                                         |
|-----------------|--------------------------|-----------------------------------------------|
| `bankMission`   | `HINDSIGHT_BANK_MISSION` | String value                                  |
| `retainMission` | _(none)_                 | Must be set via config file or plugin options |

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

## Lazy Initialization Pattern

Missions are **not** set at plugin startup. Instead, `ensureBankMission` (in `src/bank.ts`) is called lazily right before the first operation that needs it.

### Logic

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

### Key Behaviors

- **Guard on empty**: If `bankMission` is empty or whitespace, no API call is made. The bank will be auto-created with server defaults on first use.
- **Idempotent per bank**: An in-memory `Set<string>` tracks which banks have already been configured. Each bank ID is only sent a `createBank` call once per plugin lifetime.
- **Eviction**: If the tracking set exceeds 10,000 entries, the oldest half is purged (sorted alphabetically).
- **Failure-tolerant**: Errors are caught and logged at debug level. A failed mission-set does not block retain/recall/reflect operations.

## Call Sites

`ensureBankMission` is invoked before these operations:

| Call site                          | Operation                            | File               |
|------------------------------------|--------------------------------------|--------------------|
| Before manual retain               | `hindsight_retain` tool execution    | `src/tools.ts:43`  |
| Before reflect                     | `hindsight_reflect` tool execution   | `src/tools.ts:95`  |
| Before auto-retain (session end)   | Automatic retention on session close | `src/hooks.ts:182` |
| Before auto-retain (idle/periodic) | Automatic retention on idle timer    | `src/hooks.ts:304` |

`hindsight_recall` does **not** call `ensureBankMission` — recall is read-only and does not require the bank to be pre-configured.

## Server-Side Effect

`client.createBank(bankId, { reflectMission, retainMission })` is an upsert:

- **First call**: Creates the bank with the configured missions.
- **Subsequent calls** (e.g., after eviction from the tracking set): Re-applies missions. This is effectively a no-op if the values are unchanged.

## Bank ID Derivation

The bank that receives the mission is identified by its derived ID. Two modes exist:

### Static Mode (default)

Uses `config.bankId` or falls back to `"opencode"`, with an optional prefix:

```
bankIdPrefix + "-" + (bankId || "opencode")
```

### Dynamic Mode

Enabled via `dynamicBankId: true`. Composes segments from `dynamicBankGranularity` joined by `::`:

```
opencode::my-project
```

Available segments: `agent`, `project`, `channel`, `user`.

## Related Config Fields

| Field                    | Default                | Env var                     | Description                         |
|--------------------------|------------------------|-----------------------------|-------------------------------------|
| `bankId`                 | `null`                 | `HINDSIGHT_BANK_ID`         | Static bank ID override             |
| `bankIdPrefix`           | `""`                   | —                           | Prefix prepended to derived bank ID |
| `dynamicBankId`          | `false`                | `HINDSIGHT_DYNAMIC_BANK_ID` | Enable dynamic ID derivation        |
| `dynamicBankGranularity` | `["agent", "project"]` | —                           | Segments composing dynamic ID       |
| `agentName`              | `"opencode"`           | `HINDSIGHT_AGENT_NAME`      | Agent name used in dynamic IDs      |
| `bankMission`            | `""`                   | `HINDSIGHT_BANK_MISSION`    | Reflect mission text                |
| `retainMission`          | `null`                 | —                           | Retain extraction mission text      |
