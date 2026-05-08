/**
 * Custom tool definitions for the Hindsight OpenCode plugin.
 *
 * Registers hindsight_retain, hindsight_recall, and hindsight_reflect
 * as tools the agent can call explicitly.
 */

import { tool } from "@opencode-ai/plugin/tool";
import type { ToolDefinition } from "@opencode-ai/plugin/tool";
import type { HindsightClient } from "@vectorize-io/hindsight-client";
import type { HindsightConfig, BankIds } from "./config.js";
import { formatMemories, formatCurrentTime } from "./content.js";
import { ensureBankMission, ensureBankMissions } from "./bank.js";

export interface HindsightTools {
  hindsight_retain: ToolDefinition;
  hindsight_recall: ToolDefinition;
  hindsight_reflect: ToolDefinition;
}

export function createTools(
  client: HindsightClient,
  bankIds: BankIds,
  config: HindsightConfig,
  missionsSet?: Set<string>
): HindsightTools {
  const hindsight_retain = tool({
    description:
      "Store information in long-term memory. Use this to remember important facts, " +
      "user preferences, project context, decisions, and anything worth recalling in future sessions. " +
      "Be specific — include who, what, when, and why.",
    args: {
      content: tool.schema
        .string()
        .describe("The information to remember. Be specific and self-contained."),
      context: tool.schema
        .string()
        .optional()
        .describe("Optional context about where this information came from."),
    },
    async execute(args) {
      if (missionsSet) {
        if (bankIds.user) {
          await ensureBankMissions(
            client,
            bankIds.project,
            bankIds.user,
            config,
            missionsSet
          );
        } else {
          await ensureBankMission(client, bankIds.project, config, missionsSet);
        }
      }

      const retainOpts = {
        context: args.context || config.retainContext,
        tags: config.retainTags.length ? config.retainTags : undefined,
        metadata: Object.keys(config.retainMetadata).length ? config.retainMetadata : undefined,
      };

      if (bankIds.user) {
        // Dual-write: send to both banks in parallel
        await Promise.all([
          client.retain(bankIds.project, args.content, retainOpts),
          client.retain(bankIds.user, args.content, retainOpts),
        ]);
      } else {
        await client.retain(bankIds.project, args.content, retainOpts);
      }

      return "Memory stored successfully.";
    },
  });

  const hindsight_recall = tool({
    description:
      "Search long-term memory for relevant information. Use this proactively before " +
      "answering questions about past conversations, user preferences, project history, " +
      "or any topic where prior context would help. When in doubt, recall first.",
    args: {
      query: tool.schema
        .string()
        .describe("Natural language search query. Be specific about what you need to know."),
    },
    async execute(args) {
      if (bankIds.user) {
        // Dual-bank: query both with token budget split (60% project, 40% user)
        const projectTokens = Math.floor(config.recallMaxTokens * 0.6);
        const userTokens = Math.floor(config.recallMaxTokens * 0.4);

        const baseOpts = {
          budget: config.recallBudget as "low" | "mid" | "high",
          types: config.recallTypes,
          tags: config.recallTags.length ? config.recallTags : undefined,
          tagsMatch: config.recallTags.length ? config.recallTagsMatch : undefined,
        };

        const [projectResponse, userResponse] = await Promise.all([
          client.recall(bankIds.project, args.query, {
            ...baseOpts,
            maxTokens: projectTokens,
          }),
          client.recall(bankIds.user, args.query, {
            ...baseOpts,
            maxTokens: userTokens,
          }),
        ]);

        const projectResults = projectResponse.results || [];
        const userResults = userResponse.results || [];

        if (!projectResults.length && !userResults.length) {
          return "No relevant memories found.";
        }

        const parts: string[] = [];
        parts.push(
          `Found ${projectResults.length + userResults.length} relevant memories (as of ${formatCurrentTime()} UTC):`
        );

        if (projectResults.length) {
          parts.push(`\n## From project context:\n\n${formatMemories(projectResults)}`);
        }
        if (userResults.length) {
          parts.push(`\n## From personal preferences:\n\n${formatMemories(userResults)}`);
        }

        return parts.join("\n");
      }

      // Single-bank mode
      const response = await client.recall(bankIds.project, args.query, {
        budget: config.recallBudget as "low" | "mid" | "high",
        maxTokens: config.recallMaxTokens,
        types: config.recallTypes,
        tags: config.recallTags.length ? config.recallTags : undefined,
        tagsMatch: config.recallTags.length ? config.recallTagsMatch : undefined,
      });

      const results = response.results || [];
      if (!results.length) return "No relevant memories found.";

      const formatted = formatMemories(results);
      return `Found ${results.length} relevant memories (as of ${formatCurrentTime()} UTC):\n\n${formatted}`;
    },
  });

  const hindsight_reflect = tool({
    description:
      "Generate a thoughtful answer using long-term memory. Unlike recall (which returns " +
      "raw memories), reflect synthesizes memories into a coherent answer. Use for questions " +
      'like "What do you know about this user?" or "Summarize our project decisions."',
    args: {
      query: tool.schema.string().describe("The question to answer using long-term memory."),
      context: tool.schema
        .string()
        .optional()
        .describe("Optional additional context to guide the reflection."),
      scope: tool.schema
        .string()
        .optional()
        .describe(
          'Which memory bank to reflect on: "project" (default) for codebase-specific ' +
            'knowledge, or "user" for personal preferences and habits.'
        ),
    },
    async execute(args) {
      const scope = (args.scope as "project" | "user") || "project";
      const targetBankId =
        scope === "user" && bankIds.user ? bankIds.user : bankIds.project;

      if (missionsSet) {
        if (bankIds.user) {
          await ensureBankMissions(
            client,
            bankIds.project,
            bankIds.user,
            config,
            missionsSet
          );
        } else {
          await ensureBankMission(client, bankIds.project, config, missionsSet);
        }
      }

      const response = await client.reflect(targetBankId, args.query, {
        context: args.context,
        budget: config.recallBudget as "low" | "mid" | "high",
      });

      return response.text || "No relevant information found to reflect on.";
    },
  });

  return { hindsight_retain, hindsight_recall, hindsight_reflect };
}
