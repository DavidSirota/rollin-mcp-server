#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://joinrollin.com/api/v1";

const API_KEY = process.env.ROLLIN_API_KEY;
if (!API_KEY) {
  process.stderr.write(
    "Error: ROLLIN_API_KEY environment variable is required.\n" +
    "Get your free API key at https://joinrollin.com/portal.html\n"
  );
  process.exit(1);
}

// --- Helpers ---

async function apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": API_KEY! },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

// --- Server ---

const server = new McpServer({
  name: "rollin",
  version: "1.0.0",
});

// TOOL 1: Search locations
server.registerTool(
  "search_locations",
  {
    title: "Search Accessible Locations",
    description:
      "Search for wheelchair-accessible restaurants, cafes, and bars near a location. " +
      "Returns scored results with accessibility features. Requires latitude and longitude.",
    inputSchema: {
      q: z.string().optional().describe("Search by name, cuisine, or category (e.g. 'sushi', 'Italian')"),
      lat: z.number().describe("Latitude of the search center"),
      lng: z.number().describe("Longitude of the search center"),
      radius: z.number().min(0.1).max(25).default(5).optional()
        .describe("Search radius in miles (default 5, max 25)"),
      min_score: z.number().min(0).max(100).optional()
        .describe("Minimum accessibility score (0-100)"),
      features: z.string().optional()
        .describe("Comma-separated feature filter: wheelchair_entry, accessible_restroom, level_entry, parking, elevator, wide_aisles"),
      limit: z.number().min(1).max(50).default(10).optional()
        .describe("Number of results (default 10, max 50)"),
    },
  },
  async (params) => {
    try {
      const queryParams: Record<string, string> = {};
      if (params.q) queryParams.q = params.q;
      queryParams.lat = String(params.lat);
      queryParams.lng = String(params.lng);
      if (params.radius) queryParams.radius = String(params.radius);
      if (params.min_score) queryParams.min_score = String(params.min_score);
      if (params.features) queryParams.features = params.features;
      if (params.limit) queryParams.limit = String(params.limit);

      const data = await apiGet("/locations", queryParams);
      return textResult(data);
    } catch (err) {
      return errorResult(`Failed to search locations: ${(err as Error).message}`);
    }
  }
);

// TOOL 2: Get location details + score breakdown
server.registerTool(
  "get_location_details",
  {
    title: "Get Location Details",
    description:
      "Get full accessibility details and score breakdown for a specific location. " +
      "Returns features, score components, and verification status.",
    inputSchema: {
      id: z.string().describe("Location ID (from search results)"),
    },
  },
  async ({ id }) => {
    try {
      const [details, score] = await Promise.all([
        apiGet(`/locations/${encodeURIComponent(id)}`),
        apiGet(`/score/${encodeURIComponent(id)}`).catch(() => null),
      ]);

      const result: Record<string, unknown> = { ...(details as Record<string, unknown>) };
      if (score) {
        result.score_breakdown = score;
      }

      return textResult(result);
    } catch (err) {
      return errorResult(`Failed to get location details: ${(err as Error).message}`);
    }
  }
);

// TOOL 3: List coverage regions
server.registerTool(
  "list_regions",
  {
    title: "List Coverage Regions",
    description:
      "List all regions where accessibility data is available. " +
      "Returns states, regions, and location counts for each area.",
    inputSchema: {},
  },
  async () => {
    try {
      const data = await apiGet("/regions");
      return textResult(data);
    } catch (err) {
      return errorResult(`Failed to list regions: ${(err as Error).message}`);
    }
  }
);

// TOOL 4: Submit feedback
server.registerTool(
  "submit_feedback",
  {
    title: "Submit Location Feedback",
    description:
      "Submit a correction or feedback about a location's accessibility. " +
      "Use this when a user reports that accessibility information is inaccurate.",
    inputSchema: {
      location_id: z.string().describe("Location ID to submit feedback for"),
      feedback_type: z.enum(["accurate", "inaccurate", "correction"])
        .describe("Type: 'accurate' to confirm, 'inaccurate' to flag, 'correction' to update features"),
      features: z.record(z.boolean().nullable()).optional()
        .describe("Feature corrections, e.g. { wheelchair_entry: true, parking: false }"),
      comment: z.string().max(1000).optional()
        .describe("Additional context (max 1000 characters)"),
    },
  },
  async (params) => {
    try {
      const data = await apiPost("/feedback", {
        location_id: params.location_id,
        feedback_type: params.feedback_type,
        features: params.features,
        comment: params.comment,
      });
      return textResult(data);
    } catch (err) {
      return errorResult(`Failed to submit feedback: ${(err as Error).message}`);
    }
  }
);

// TOOL 5: Health check
server.registerTool(
  "check_health",
  {
    title: "Check API Health",
    description: "Check if the ROLLIN API is operational.",
    inputSchema: {},
  },
  async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      return textResult(data);
    } catch (err) {
      return errorResult(`API health check failed: ${(err as Error).message}`);
    }
  }
);

// RESOURCE: API info
server.resource(
  "api-info",
  "rollin://api-info",
  {
    description: "ROLLIN API overview and available features",
    mimeType: "text/plain",
  },
  async () => ({
    contents: [
      {
        uri: "rollin://api-info",
        mimeType: "text/plain",
        text:
          "ROLLIN Accessibility API\n" +
          "========================\n\n" +
          "Wheelchair accessibility data for 56,000+ restaurants, cafes, and bars across 6 US states.\n\n" +
          "Coverage: New York, California, Florida, Massachusetts, New Jersey, Pennsylvania\n" +
          "Regions: 22 metro areas and regions\n\n" +
          "Accessibility features tracked:\n" +
          "- wheelchair_entry: Step-free entrance\n" +
          "- accessible_restroom: ADA-compliant restroom\n" +
          "- level_entry: No steps at entrance\n" +
          "- parking: Accessible parking available\n" +
          "- elevator: Elevator access between floors\n" +
          "- wide_aisles: Sufficient space for wheelchair navigation\n\n" +
          "Scores: 0-100 scale based on multiple verified sources.\n\n" +
          "Docs: https://joinrollin.com/developers.html\n" +
          "API Keys: https://joinrollin.com/portal.html\n" +
          "Status: https://joinrollin.com/status.html\n",
      },
    ],
  })
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("ROLLIN MCP server running\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
