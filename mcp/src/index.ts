#!/usr/bin/env node
/**
 * stakesense-mcp — Model Context Protocol server exposing predictive
 * validator quality scoring for Solana to Claude Desktop, Claude Code,
 * Cursor, and any MCP-compatible LLM agent.
 *
 * Wires the public stakesense REST API into MCP tools and resources so
 * an agent can answer questions like "which Solana validators have the
 * lowest predicted downtime risk this week?" without bespoke plumbing.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { StakesenseClient } from "./client.js";
import { TOOLS, callTool } from "./tools.js";
import { RESOURCES, readResource } from "./resources.js";

const PACKAGE_VERSION = "0.1.0";

async function main() {
  const apiBase =
    process.env.STAKESENSE_API_BASE || "https://stakesense.onrender.com";
  const client = new StakesenseClient(apiBase);

  const server = new Server(
    {
      name: "stakesense",
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await callTool(client, req.params.name, req.params.arguments ?? {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params;
    const body = await readResource(client, uri);
    return {
      contents: [
        {
          uri,
          mimeType: body.mimeType,
          text: body.text,
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[stakesense-mcp v${PACKAGE_VERSION}] connected (api=${apiBase})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[stakesense-mcp] fatal: ${err}\n`);
  process.exit(1);
});
