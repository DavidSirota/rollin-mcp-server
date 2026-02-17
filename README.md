# ROLLIN MCP Server

MCP server for the [ROLLIN Accessibility API](https://joinrollin.com) — wheelchair accessibility data for 56,000+ US restaurants, cafes, and bars.

Works with Claude Desktop, Claude Code, Cursor, VS Code, and any MCP-compatible client.

## Setup

### 1. Get an API Key

Sign up for a free API key at [joinrollin.com/portal.html](https://joinrollin.com/portal.html).

### 2. Configure Your Client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rollin": {
      "command": "npx",
      "args": ["-y", "rollin-mcp-server"],
      "env": {
        "ROLLIN_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add rollin -- npx -y rollin-mcp-server
```

Then set your API key in the environment.

#### Cursor / VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "rollin": {
      "command": "npx",
      "args": ["-y", "rollin-mcp-server"],
      "env": {
        "ROLLIN_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_locations` | Search for accessible restaurants near a location by name, cuisine, or category |
| `get_location_details` | Get full accessibility details and score breakdown for a specific location |
| `list_regions` | List all coverage areas with location counts |
| `submit_feedback` | Submit corrections about a location's accessibility |
| `check_health` | Verify the API is operational |

## Example Prompts

Once configured, try asking your AI assistant:

- "Find wheelchair accessible Italian restaurants near Times Square"
- "What's the accessibility score for location [ID]?"
- "Which cities does ROLLIN cover?"
- "That restaurant actually has a ramp now — can you update it?"

## Coverage

6 US states, 22 regions, 56,000+ scored locations:

- **New York** — NYC Metro, Hudson Valley, Long Island, Capital Region, Finger Lakes, Western NY, Adirondacks
- **California** — LA Metro, SF Bay Area, San Diego, Sacramento, Central Coast, Inland Empire
- **Florida** — Miami, Orlando, Tampa Bay, Jacksonville, Southwest FL
- **Massachusetts** — Boston Metro, Western MA
- **New Jersey** — Statewide
- **Pennsylvania** — Statewide

## API Tiers

The MCP server uses your API key and respects tier limits:

| Tier | Requests/Month | Price |
|------|---------------|-------|
| Free | 1,000 | $0 |
| Developer | 50,000 | $29/mo |
| Business | 500,000 | $149/mo |

Get your key at [joinrollin.com/portal.html](https://joinrollin.com/portal.html).

## Links

- [API Documentation](https://joinrollin.com/developers.html)
- [Developer Portal](https://joinrollin.com/portal.html)
- [API Status](https://joinrollin.com/status.html)
- [Python SDK](https://github.com/stainless-commons/rollin-python)

## License

MIT — Stackline Studio
