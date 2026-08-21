#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const API_BASE = "https://joinrollin.com/api/v1";
const VERSION = "1.2.0";
const TRIAL_LIMIT = 5;
const PORTAL_URL = "https://joinrollin.com/portal";
// --- Trial Mode ---
const API_KEY = process.env.ROLLIN_API_KEY;
const TRIAL_MODE = !API_KEY;
// Trial mode uses a dedicated endpoint that doesn't require auth.
// No hardcoded keys — trial requests go through a rate-limited public path.
// Server-side rate limiting (by IP) prevents abuse. No key to extract.
const TRIAL_API_BASE = "https://joinrollin.com/api/v1/trial";
let trialRequestCount = 0;
// Live npm download count — fetched once on startup for social proof
let npmMonthlyDownloads = 500; // fallback
if (TRIAL_MODE) {
    fetch("https://api.npmjs.org/downloads/point/last-month/rollin-mcp-server")
        .then(r => r.json())
        .then(d => { if (d.downloads)
        npmMonthlyDownloads = d.downloads; })
        .catch(() => { });
}
// Unique session ID per boot — server uses this for rate limiting trial sessions
const trialSessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
const session = {
    searches: [],
    locations_found: 0,
    details_viewed: [],
    regions_checked: false,
    feedback_given: false
};
function getActiveKey() {
    return API_KEY || "";
}
function checkTrialLimit() {
    if (!TRIAL_MODE)
        return { allowed: true, remaining: Infinity };
    if (trialRequestCount >= TRIAL_LIMIT)
        return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: TRIAL_LIMIT - trialRequestCount };
}
function consumeTrialRequest() {
    if (TRIAL_MODE)
        trialRequestCount++;
}
// --- Personalized Sales Pitch ---
// Uses session data + psychology to craft a compelling upgrade message
function buildSalesPitch() {
    const pitches = [];
    // Loss aversion — they already found value, don't let them lose it
    if (session.locations_found > 0) {
        pitches.push(`You found ${session.locations_found} accessible venues in this session. With a free API key, you get unlimited searches — every restaurant, every score, every time.`);
    }
    // Personalized based on what they searched
    if (session.searches.length > 0) {
        const lastSearch = session.searches[session.searches.length - 1];
        pitches.push(`You were searching for "${lastSearch}" — there are likely dozens more results you haven't seen yet. A free key unlocks all of them.`);
    }
    // If they viewed specific locations, they're invested
    if (session.details_viewed.length > 0) {
        const name = session.details_viewed[session.details_viewed.length - 1];
        pitches.push(`You checked the details on ${name}. With unlimited access, you can compare every venue in the area — scores, features, lighting, community reviews.`);
    }
    // If they gave feedback, they're a contributor
    if (session.feedback_given) {
        pitches.push(`You already submitted feedback — you're part of the community now. With a free key, your contributions carry trust weight and directly improve scores.`);
    }
    // Closing — escalate from free to Starter to Developer
    const closers = [
        `Start free with 1,000 requests/month. Need more? The Starter plan is $9.99/month — 5,000 requests, all endpoints, and you're building something that actually matters. Outgrow that? Developer at $29/month gives you 50,000.`,
        `The free tier gets you started. But if you're building an app, the Starter plan at $9.99/month gives you 5x the volume. That's less than a coffee a week — and you're making every meal out better for someone in a wheelchair.`,
        `${npmMonthlyDownloads.toLocaleString()} developers installed this month. Most start on the $9.99/month Starter plan — 5,000 requests, all endpoints. The ones shipping production apps upgrade to Developer at $29. Start free, upgrade when it clicks.`,
        `Free tier: 1,000 requests. Starter: 5,000 for $9.99/month. Developer: 50,000 for $29/month. You just used 5 trial requests to see the data is real. Imagine what you'd build with 5,000.`,
        `${npmMonthlyDownloads.toLocaleString()} installs this month — and growing. Unlimited access from $9.99/month on the Starter plan. Need more volume? Developer at $29/month. Start free, scale when ready.`
    ];
    // Build the final pitch
    const personal = pitches.length > 0
        ? pitches[Math.floor(Math.random() * pitches.length)]
        : "You just saw what ROLLIN can do. Imagine having that data in every conversation, every search, every app you build.";
    const closer = closers[Math.floor(Math.random() * closers.length)];
    return `${personal}\n\n${closer}`;
}
function trialExpiredResult() {
    const pitch = buildSalesPitch();
    return {
        content: [{
                type: "text",
                text: JSON.stringify({
                    trial_expired: true,
                    message: pitch,
                    action: "Get your free API key — takes 10 seconds, no credit card.",
                    url: PORTAL_URL,
                    setup_hint: "After signing up: set ROLLIN_API_KEY in your MCP config and restart the server.",
                    session_summary: {
                        searches_made: session.searches.length,
                        locations_found: session.locations_found,
                        venues_inspected: session.details_viewed.length,
                        feedback_submitted: session.feedback_given
                    }
                }, null, 2)
            }],
    };
}
// Progressive nudges — get more urgent as requests run out
function getTrialNudge(remaining) {
    if (remaining === 3)
        return `3 trial requests left. Getting value? Unlimited access from $9.99/mo — or start free: ${PORTAL_URL}`;
    if (remaining === 2)
        return `2 requests left. Don't lose access — Starter plan is $9.99/mo for 5,000 requests. Free tier available too: ${PORTAL_URL}`;
    if (remaining === 1)
        return `Last trial request. Starter: $9.99/mo for 5,000 requests. Developer: $29/mo for 50,000. Or start free: ${PORTAL_URL}`;
    return `Trial mode: ${remaining} requests left. Unlimited access from $9.99/mo: ${PORTAL_URL}`;
}
function appendTrialInfo(data, remaining) {
    if (!TRIAL_MODE)
        return data;
    const obj = typeof data === "object" && data !== null
        ? { ...data }
        : { data };
    obj._trial = {
        mode: true,
        requests_remaining: remaining,
        message: getTrialNudge(remaining)
    };
    return obj;
}
// --- Helpers ---
async function apiGet(path, params) {
    const base = TRIAL_MODE ? TRIAL_API_BASE : API_BASE;
    const url = new URL(`${base}${path}`);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== "")
                url.searchParams.set(k, v);
        });
    }
    const headers = {};
    if (!TRIAL_MODE && API_KEY) {
        headers["X-API-Key"] = API_KEY;
    }
    // Trial requests include a fingerprint so server can rate-limit per-instance
    if (TRIAL_MODE) {
        headers["X-Trial-Session"] = trialSessionId;
    }
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body}`);
    }
    return res.json();
}
async function apiPost(path, body) {
    const base = TRIAL_MODE ? TRIAL_API_BASE : API_BASE;
    const headers = { "Content-Type": "application/json" };
    if (!TRIAL_MODE && API_KEY) {
        headers["X-API-Key"] = API_KEY;
    }
    if (TRIAL_MODE) {
        headers["X-Trial-Session"] = trialSessionId;
    }
    const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
}
function textResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function errorResult(message) {
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
// --- Input sanitization ---
function sanitizeString(input, maxLength = 200) {
    // Strip control characters, limit length, trim whitespace
    return input
        .replace(/[\x00-\x1f\x7f]/g, "")
        .slice(0, maxLength)
        .trim();
}
// --- Trial-aware tool wrapper ---
function withTrialGuard(handler) {
    return async (...args) => {
        const { allowed, remaining } = checkTrialLimit();
        if (!allowed)
            return trialExpiredResult();
        consumeTrialRequest();
        const result = await handler(...args);
        // Inject trial info into successful responses
        if (TRIAL_MODE && result.content && !result.isError) {
            try {
                const parsed = JSON.parse(result.content[0].text);
                const withInfo = appendTrialInfo(parsed, TRIAL_LIMIT - trialRequestCount);
                return textResult(withInfo);
            }
            catch {
                return result;
            }
        }
        return result;
    };
}
// --- Server ---
const server = new mcp_js_1.McpServer({
    name: "rollin",
    version: VERSION,
});
// TOOL 1: Search locations
server.registerTool("search_locations", {
    title: "Search Accessible Locations",
    description: "Search for wheelchair-accessible restaurants, cafes, and bars near a location. " +
        "Returns scored results with accessibility features. Requires latitude and longitude.",
    inputSchema: {
        q: zod_1.z.string().optional().describe("Search by name, cuisine, or category (e.g. 'sushi', 'Italian')"),
        lat: zod_1.z.number().describe("Latitude of the search center"),
        lng: zod_1.z.number().describe("Longitude of the search center"),
        radius: zod_1.z.number().min(0.1).max(25).default(5).optional()
            .describe("Search radius in miles (default 5, max 25)"),
        min_score: zod_1.z.number().min(0).max(100).optional()
            .describe("Minimum accessibility score (0-100)"),
        features: zod_1.z.string().optional()
            .describe("Comma-separated feature filter: wheelchair_entry, accessible_restroom, level_entry, parking, elevator, wide_aisles"),
        limit: zod_1.z.number().min(1).max(50).default(10).optional()
            .describe("Number of results (default 10, max 50)"),
        lighting: zod_1.z.enum(["bright", "moderate", "dim"]).optional()
            .describe("Filter by ambient lighting level: bright, moderate, or dim"),
    },
}, withTrialGuard(async (params) => {
    try {
        const queryParams = {};
        if (params.q)
            queryParams.q = sanitizeString(params.q);
        queryParams.lat = String(params.lat);
        queryParams.lng = String(params.lng);
        if (params.radius)
            queryParams.radius = String(params.radius);
        if (params.min_score)
            queryParams.min_score = String(params.min_score);
        if (params.features)
            queryParams.features = sanitizeString(params.features);
        if (params.limit)
            queryParams.limit = String(params.limit);
        if (params.lighting)
            queryParams.lighting = params.lighting;
        const data = await apiGet("/locations", queryParams);
        // Track session for personalized pitch
        if (TRIAL_MODE) {
            if (params.q)
                session.searches.push(sanitizeString(params.q));
            try {
                const parsed = data;
                const locs = parsed.locations || parsed.results || [];
                if (Array.isArray(locs))
                    session.locations_found += locs.length;
            }
            catch { }
        }
        return textResult(data);
    }
    catch (err) {
        return errorResult(`Failed to search locations: ${err.message}`);
    }
}));
// TOOL 2: Get location details + score breakdown
server.registerTool("get_location_details", {
    title: "Get Location Details",
    description: "Get full accessibility details and score breakdown for a specific location. " +
        "Returns features, score components, and verification status.",
    inputSchema: {
        id: zod_1.z.string().describe("Location ID (from search results)"),
    },
}, withTrialGuard(async ({ id }) => {
    try {
        const [details, score] = await Promise.all([
            apiGet(`/locations/${encodeURIComponent(id)}`),
            apiGet(`/score/${encodeURIComponent(id)}`).catch(() => null),
        ]);
        const result = { ...details };
        if (score) {
            result.score_breakdown = score;
        }
        // Track session
        if (TRIAL_MODE && result.name) {
            session.details_viewed.push(String(result.name));
        }
        return textResult(result);
    }
    catch (err) {
        return errorResult(`Failed to get location details: ${err.message}`);
    }
}));
// TOOL 3: List coverage regions
server.registerTool("list_regions", {
    title: "List Coverage Regions",
    description: "List all regions where accessibility data is available. " +
        "Returns states, regions, and location counts for each area.",
    inputSchema: {},
}, withTrialGuard(async () => {
    try {
        const data = await apiGet("/regions");
        if (TRIAL_MODE)
            session.regions_checked = true;
        return textResult(data);
    }
    catch (err) {
        return errorResult(`Failed to list regions: ${err.message}`);
    }
}));
// TOOL 4: Submit feedback
server.registerTool("submit_feedback", {
    title: "Submit Location Feedback",
    description: "Submit a correction or feedback about a location's accessibility. " +
        "Use this when a user reports that accessibility information is inaccurate.",
    inputSchema: {
        location_id: zod_1.z.string().describe("Location ID to submit feedback for"),
        feedback_type: zod_1.z.enum(["accurate", "inaccurate", "correction"])
            .describe("Type: 'accurate' to confirm, 'inaccurate' to flag, 'correction' to update features"),
        features: zod_1.z.record(zod_1.z.boolean().nullable()).optional()
            .describe("Feature corrections, e.g. { wheelchair_entry: true, parking: false }"),
        comment: zod_1.z.string().max(1000).optional()
            .describe("Additional context (max 1000 characters)"),
    },
}, withTrialGuard(async (params) => {
    try {
        const data = await apiPost("/feedback", {
            location_id: sanitizeString(params.location_id, 100),
            feedback_type: params.feedback_type,
            features: params.features,
            comment: params.comment ? sanitizeString(params.comment, 1000) : undefined,
        });
        if (TRIAL_MODE)
            session.feedback_given = true;
        return textResult(data);
    }
    catch (err) {
        return errorResult(`Failed to submit feedback: ${err.message}`);
    }
}));
// TOOL 5: Health check (not trial-gated — always works)
server.registerTool("check_health", {
    title: "Check API Health",
    description: "Check if the ROLLIN API is operational. Also reports trial mode status.",
    inputSchema: {},
}, async () => {
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        // Add server info
        data.mcp_server_version = VERSION;
        data.trial_mode = TRIAL_MODE;
        if (TRIAL_MODE) {
            data.trial_requests_used = trialRequestCount;
            data.trial_requests_remaining = Math.max(0, TRIAL_LIMIT - trialRequestCount);
            data.get_api_key = PORTAL_URL;
        }
        return textResult(data);
    }
    catch (err) {
        return errorResult(`API health check failed: ${err.message}`);
    }
});
// RESOURCE: API info
server.resource("api-info", "rollin://api-info", {
    description: "ROLLIN API overview and available features",
    mimeType: "text/plain",
}, async () => ({
    contents: [
        {
            uri: "rollin://api-info",
            mimeType: "text/plain",
            text: "ROLLIN Accessibility API\n" +
                "========================\n\n" +
                "Wheelchair accessibility data for 98,000+ restaurants, cafes, and bars across 15 US states.\n\n" +
                "Coverage: NY, CA, MA, FL, IL, CO, TX, OH, ID, NJ, PA, DC, AZ, WA, OR\n" +
                "Regions: 48 metro areas and regions\n\n" +
                "Accessibility features tracked:\n" +
                "- wheelchair_entry: Step-free entrance\n" +
                "- accessible_restroom: ADA-compliant restroom\n" +
                "- level_entry: No steps at entrance\n" +
                "- parking: Accessible parking available\n" +
                "- elevator: Elevator access between floors\n" +
                "- wide_aisles: Sufficient space for wheelchair navigation\n\n" +
                "Scores: 0-100 scale based on proprietary multi-source data pipeline.\n\n" +
                "Docs: https://joinrollin.com/developers.html\n" +
                "API Keys: https://joinrollin.com/portal.html\n" +
                "MCP Server: https://joinrollin.com/mcp\n" +
                "Status: https://joinrollin.com/status.html\n",
        },
    ],
}));
// --- Start ---
async function main() {
    // Welcome banner
    if (TRIAL_MODE) {
        process.stderr.write("\n" +
            "  ╔══════════════════════════════════════════════════╗\n" +
            `  ║  ROLLIN MCP Server v${VERSION}                       ║\n` +
            "  ║  Running in trial mode (5 requests per session)  ║\n" +
            "  ║                                                  ║\n" +
            "  ║  Get your free API key for unlimited access:     ║\n" +
            "  ║  → https://joinrollin.com/portal                 ║\n" +
            "  ║                                                  ║\n" +
            "  ║  Then set: ROLLIN_API_KEY=your_key_here          ║\n" +
            "  ╚══════════════════════════════════════════════════╝\n\n");
    }
    else {
        process.stderr.write(`ROLLIN MCP server v${VERSION} running (authenticated)\n`);
    }
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map