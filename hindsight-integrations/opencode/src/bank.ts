/**
 * Bank ID derivation and mission management.
 *
 * Port of Claude Code plugin's bank.py, adapted for OpenCode's context model.
 *
 * Dimensions for dynamic bank IDs:
 *   - agent      → configured name or "opencode"
 *   - project    → derived from the working directory basename
 *   - gitProject → derived from the main worktree's basename when inside a
 *                  git repository (so all linked worktrees of the same repo
 *                  share a single memory bank). Falls back to the working
 *                  directory basename when git is unavailable or the
 *                  directory is not a repo.
 */

import { basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { userInfo } from "node:os";
import type { HindsightConfig } from "./config.js";
import { debugLog } from "./config.js";
import type { HindsightClient } from "@vectorize-io/hindsight-client";

const DEFAULT_BANK_NAME = "opencode";
const VALID_FIELDS = new Set(["agent", "project", "gitProject", "channel", "user"]);

/**
 * Resolve the main worktree root for a directory inside a git repository.
 *
 * Uses `git rev-parse --path-format=absolute --git-common-dir`, which always
 * points to the .git directory of the *main* worktree, even when invoked from
 * a linked worktree (created with `git worktree add`). The parent of that path
 * is the main worktree root, so all linked worktrees of the same repo resolve
 * to the same root and end up sharing one memory bank.
 *
 * Returns `null` when git is unavailable, the directory is not a repo, or the
 * git invocation fails for any other reason.
 */
function getProjectRootFromGit(directory: string): string | null {
  if (!directory) return null;
  try {
    const commonDir = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      {
        cwd: directory,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1000,
      }
    ).trim();
    if (!commonDir) return null;
    // For typical clones and `git worktree add`, common-dir is `<root>/.git`,
    // so the parent is the main worktree root. For bare repos, common-dir is
    // the bare directory itself (e.g. `myrepo.git`); use it directly.
    if (basename(commonDir) === ".git") {
      return dirname(commonDir);
    }
    return commonDir;
  } catch {
    return null;
  }
}

function deriveGitProjectName(directory: string): string {
  const projectRoot = getProjectRootFromGit(directory);
  if (projectRoot) return basename(projectRoot);
  return directory ? basename(directory) : "unknown";
}

/**
 * Derive a bank ID from context and config.
 *
 * Static mode: returns config.bankId or DEFAULT_BANK_NAME.
 * Dynamic mode: composes from granularity fields joined by '::'.
 */
export function deriveBankId(config: HindsightConfig, directory: string): string {
  const prefix = config.bankIdPrefix;

  if (!config.dynamicBankId) {
    const base = config.bankId || DEFAULT_BANK_NAME;
    return prefix ? `${prefix}-${base}` : base;
  }

  const fields = config.dynamicBankGranularity?.length
    ? config.dynamicBankGranularity
    : ["agent", "project"];

  for (const f of fields) {
    if (!VALID_FIELDS.has(f)) {
      console.error(
        `[Hindsight] Unknown dynamicBankGranularity field "${f}" — ` +
          `valid: ${[...VALID_FIELDS].sort().join(", ")}`
      );
    }
  }

  const channelId = process.env.HINDSIGHT_CHANNEL_ID || "";
  const userId = process.env.HINDSIGHT_USER_ID || "";

  // Lazy resolution so we don't spawn `git` for `gitProject` when the field
  // isn't part of the configured granularity.
  const fieldResolvers: Record<string, () => string> = {
    agent: () => config.agentName || "opencode",
    project: () => (directory ? basename(directory) : "unknown"),
    gitProject: () => deriveGitProjectName(directory),
    channel: () => channelId || "default",
    user: () => userId || "anonymous",
  };

  // bank_id is stored as-is server-side; HTTP path encoding is the client layer's job.
  const segments = fields.map((f) => fieldResolvers[f]?.() || "unknown");
  const baseBankId = segments.join("::");

  return prefix ? `${prefix}-${baseBankId}` : baseBankId;
}

/**
 * Derive the user bank ID for dual-bank mode.
 *
 * Resolution order:
 *   1. config.userBankId (explicit override)
 *   2. HINDSIGHT_USER_ID env var
 *   3. OS username via os.userInfo()
 *
 * Format: "coding::user::<identifier>" with optional prefix.
 */
export function deriveUserBankId(config: HindsightConfig): string {
  const identifier =
    config.userBankId || process.env.HINDSIGHT_USER_ID || userInfo().username;
  const base = `coding::user::${identifier}`;
  return config.bankIdPrefix ? `${config.bankIdPrefix}-${base}` : base;
}

/**
 * Derive the project bank ID for dual-bank mode.
 *
 * Uses the `coding::project::` domain namespace so all coding agents
 * (OpenCode, Claude Code, Cursor, etc.) share the same project bank
 * for a given repository.
 *
 * Resolution order for the identifier:
 *   1. config.bankId (explicit override)
 *   2. Git project name (main worktree basename — shared across linked worktrees)
 *   3. Working directory basename
 *
 * Format: "coding::project::<identifier>" with optional prefix.
 */
export function deriveProjectBankId(config: HindsightConfig, directory: string): string {
  const identifier = config.bankId || deriveGitProjectName(directory);
  const base = `coding::project::${identifier}`;
  return config.bankIdPrefix ? `${config.bankIdPrefix}-${base}` : base;
}

/**
 * Set bank mission on first use, skip if already set.
 * Uses an in-memory Set (plugin is long-lived, unlike Claude Code's ephemeral hooks).
 *
 * When bankType is "user", reads config.userBankMission / config.userRetainMission
 * and fails hard on error (no partial dual-bank state).
 */
export async function ensureBankMission(
  client: HindsightClient,
  bankId: string,
  config: HindsightConfig,
  missionsSet: Set<string>,
  bankType: "project" | "user" = "project"
): Promise<void> {
  const mission =
    bankType === "user" ? config.userBankMission : config.bankMission;
  const retainMission =
    bankType === "user" ? config.userRetainMission : config.retainMission;

  if (!mission?.trim()) return;
  if (missionsSet.has(bankId)) return;

  try {
    await client.createBank(bankId, {
      reflectMission: mission,
      retainMission: retainMission || undefined,
    });
    missionsSet.add(bankId);
    // Cap tracked banks
    if (missionsSet.size > 10000) {
      const keys = [...missionsSet].sort();
      for (const k of keys.slice(0, keys.length >> 1)) {
        missionsSet.delete(k);
      }
    }
    debugLog(config, `Set mission for ${bankType} bank: ${bankId}`);
  } catch (e) {
    if (bankType === "user") {
      // Fail hard — partial dual-bank state is confusing
      throw e;
    }
    // Project bank: don't fail if mission set fails
    debugLog(config, `Could not set bank mission for ${bankId}: ${e}`);
  }
}

/**
 * Ensure missions are set for both project and user banks.
 * Convenience wrapper for dual-bank mode.
 */
export async function ensureBankMissions(
  client: HindsightClient,
  projectBankId: string,
  userBankId: string,
  config: HindsightConfig,
  missionsSet: Set<string>
): Promise<void> {
  await Promise.all([
    ensureBankMission(client, projectBankId, config, missionsSet, "project"),
    ensureBankMission(client, userBankId, config, missionsSet, "user"),
  ]);
}
