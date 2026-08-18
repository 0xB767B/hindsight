# Bank ID Derivation via Git Root Commit Hash

## Motivation

The current `gitProject` derivation uses the main worktree's directory basename (via `git rev-parse --git-common-dir`). This means two clones of the same repository under different directory names produce different bank IDs:

```
git clone git@github.com:user/hindsight.git ~/work/hindsight
git clone git@github.com:user/hindsight.git ~/work/super-memory
```

Both are the same project, but get separate memory banks (`hindsight` vs `super-memory`). Knowledge learned in one clone doesn't transfer to the other.

Alternative approaches (remote URL parsing, SSH config-aware resolution) were considered and rejected due to complexity and fragility.

## Design Decision

Use the **root commit hash** (first commit in repository history) as the project identifier. The root commit is:

- Intrinsic to the repository content — independent of clone location, directory name, or remote configuration
- Immutable in practice (`git rebase -i --root` exists but is extremely rare and destructive)
- Shared across all clones, worktrees, and forks of the same repository

## New Config Field

```typescript
bankIdDerivation: "directory" | "gitRoot"  // default: "directory"
```

Environment variable: `HINDSIGHT_BANK_ID_DERIVATION`

### Values

| Value         | Behavior                                                                                   |
|---------------|--------------------------------------------------------------------------------------------|
| `"directory"` | Current behavior. Uses worktree basename (via `git-common-dir`) or raw directory basename. |
| `"gitRoot"`   | Uses the first 12 characters of the root commit hash as the project identifier.            |

### Where It Takes Effect

- **Single-bank dynamic mode**: When `gitProject` is in the `dynamicBankGranularity` list, the resolved value uses root hash instead of worktree basename.
- **Dual-bank mode**: `deriveProjectBankId` uses root hash instead of worktree basename.
- **Static single-bank mode** (`dynamicBankId: false`, `dualBankEnabled: false`): No effect — static mode uses `bankId` or the default `"opencode"`.
- **When `bankId` is explicitly set**: No effect — explicit override always wins.

## Bank ID Format

The identifier is the **pure 12-character hash** (lowercase hex), no human-readable prefix.

### Examples

Given a repo with root commit `1da177e4c3f41524e886b7f1b8a0c1fc7321cac2`:

| Mode                           | Config                                            | Result                                                 |
|--------------------------------|---------------------------------------------------|--------------------------------------------------------|
| Single-bank dynamic            | `dynamicBankGranularity: ["agent", "gitProject"]` | `opencode::1da177e4c3f4`                               |
| Dual-bank                      | `dualBankEnabled: true`                           | project: `coding::project::1da177e4c3f4`               |
| Dual-bank with prefix          | `dualBankEnabled: true`, `bankIdPrefix: "dev"`    | project: `dev-coding::project::1da177e4c3f4`           |
| Dual-bank with explicit bankId | `dualBankEnabled: true`, `bankId: "my-project"`   | project: `coding::project::my-project` (override wins) |

## Hash Length

12 hexadecimal characters = 48 bits of entropy ≈ 281 trillion possible values. The birthday paradox gives a 50% collision probability at ~16.7 million distinct repositories. This is collision-safe for any practical use.

## Git Command

```bash
git rev-list --max-parents=0 HEAD
```

Run in the working directory with:
- 1-second timeout
- stderr suppressed
- stdio: `["ignore", "pipe", "ignore"]`

## Error Conditions

All error conditions result in **plugin disabled** (`console.error` + return `{}`). No silent fallback.

### Multiple Root Commits

Some repositories have multiple root commits (e.g., after `git merge --allow-unrelated-histories`). When more than one root commit is returned:

```
[Hindsight] Multiple git root commits detected in /home/user/project.
Cannot derive a unique project bank ID automatically.
Set HINDSIGHT_BANK_ID or add bankId to your config.
```

### Not a Git Repository

When the working directory is not inside a git repository and `bankIdDerivation: "gitRoot"` is configured:

```
[Hindsight] Not a git repository: /home/user/project.
Cannot derive project bank ID with bankIdDerivation="gitRoot".
Set HINDSIGHT_BANK_ID or add bankId to your config, or use bankIdDerivation="directory".
```

### Shallow Clone

Shallow clones (`git clone --depth=N`) do not have full history. The root commit detected in a shallow clone may not be the true root commit, leading to inconsistent bank IDs across clones of different depths. Detected via `git rev-parse --is-shallow-repository`.

```
[Hindsight] Shallow git clone detected in /home/user/project.
Cannot reliably derive project bank ID with bankIdDerivation="gitRoot".
Set HINDSIGHT_BANK_ID or add bankId to your config, or run "git fetch --unshallow".
```

## Config Interaction Warnings

### `dualBankEnabled: true` + `dynamicBankId: true`

These options are mutually exclusive in practice. Dual-bank mode ignores `dynamicBankId` and `dynamicBankGranularity`. When both are set, warn:

```
[Hindsight] Both dualBankEnabled and dynamicBankId are set.
dynamicBankId is ignored when dualBankEnabled is active.
```

Plugin continues with dual-bank behavior.

## Backward Compatibility

- `bankIdDerivation` defaults to `"directory"` — zero change for existing users.
- Users opt-in to root-hash derivation per project by setting `bankIdDerivation: "gitRoot"`.
- Explicit `bankId` overrides all derivation logic regardless of mode.
- Existing memory banks under old IDs are not migrated (Hindsight has no bank rename or transfer API). Users re-accumulate memories under the new bank ID.

## Fork Behavior

Forks of the same repository share the same root commit and therefore the same bank ID. This is considered **acceptable and desirable** — architecture knowledge, conventions, and decisions from the upstream project apply equally to the fork.

Users who want fork isolation can set `bankId` explicitly.

## Configuration Examples

### Minimal (env vars)

```bash
export HINDSIGHT_DUAL_BANK=true
export HINDSIGHT_BANK_ID_DERIVATION=gitRoot
```

### Plugin options (opencode.json)

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "dualBankEnabled": true,
      "bankIdDerivation": "gitRoot"
    }]
  ]
}
```

### Config file (~/.hindsight/opencode.json)

```json
{
  "dualBankEnabled": true,
  "bankIdDerivation": "gitRoot",
  "bankMission": "Track architecture decisions and codebase conventions.",
  "userBankMission": "Track personal coding preferences and workflow habits."
}
```

## Implementation Scope

### Files to modify

| File                  | Changes                                                                                                                                              |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/config.ts`       | Add `bankIdDerivation` field, default, env var mapping, validation                                                                                   |
| `src/bank.ts`         | Add `resolveGitRoot()` function; update `deriveProjectBankId` and `gitProject` resolution to use it when `bankIdDerivation: "gitRoot"`               |
| `src/index.ts`        | Add error handling for git-root resolution failures (multiple roots, shallow clone, not a repo); add warning for `dualBankEnabled` + `dynamicBankId` |
| `src/test-helpers.ts` | Add `bankIdDerivation` to `makeConfig` defaults                                                                                                      |
| `src/bank.test.ts`    | Tests for root-hash derivation, error conditions, shallow clone detection                                                                            |
| `src/config.test.ts`  | Test env var parsing, validation                                                                                                                     |
