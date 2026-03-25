<p align="center">
  <a href="https://joinrollin.com">
    <img src="https://joinrollin.com/assets/rollin1-final.png" alt="ROLLIN" height="60">
  </a>
</p>

<h3 align="center">ROLLIN MCP Server</h3>

<p align="center">
  Wheelchair accessibility data for 105,000+ locations across 15 US states — delivered through the Model Context Protocol.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rollin-mcp-server"><img src="https://img.shields.io/npm/v/rollin-mcp-server?style=flat-square&color=14b8a6&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/rollin-mcp-server"><img src="https://img.shields.io/npm/dm/rollin-mcp-server?style=flat-square&color=14b8a6" alt="npm downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node.js >=18">
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-14b8a6?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiI+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgcng9IjIiLz48cmVjdCB4PSIxNCIgeT0iMiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgcng9IjIiLz48cmVjdCB4PSI4IiB5PSIxNCIgd2lkdGg9IjgiIGhlaWdodD0iOCIgcng9IjIiLz48L3N2Zz4=" alt="MCP Compatible"></a>
</p>

---

**The only wheelchair accessibility data source available through MCP.** Search 105,000+ restaurants, cafes, and bars across 15 US states. Get real 0–100 accessibility scores. Submit corrections through natural conversation. One protocol — every platform.

**v1.1.0** — Now includes `lighting` parameter for filtering by ambient lighting level, and `environment` object in response data with lighting details.

> Nobody should have to call ahead to ask if they can get in the door.
> ROLLIN puts accessibility data where it actually gets used.

## Why MCP?

[Model Context Protocol](https://modelcontextprotocol.io) is the open standard for connecting tools to data. No custom integrations. No API wrappers. No glue code.

Build one MCP server → every compatible client gets instant access. Think of it as **USB-C for data**: one plug, universal compatibility. ROLLIN was one of the first accessibility data providers to ship an MCP server.

**If your tool speaks MCP, it speaks accessibility.**

## Quick Start

### 1. Get a Free API Key

Sign up at **[joinrollin.com/portal](https://joinrollin.com/portal.html)** — no credit card required.

### 2. Add the Server

```bash
npx rollin-mcp-server
```

No global install. Runs anywhere Node 18+ is available.

### 3. Configure Your Client

<details>
<summary><strong>Desktop App</strong> (JSON config)</summary>

Add to your MCP client's configuration file:

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

Works with any desktop MCP client.

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `.cursor/mcp.json` in your workspace:

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

</details>

<details>
<summary><strong>VS Code</strong></summary>

Add to `.vscode/mcp.json` in your workspace:

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

</details>

<details>
<summary><strong>CLI / Headless</strong></summary>

```bash
export ROLLIN_API_KEY="your_api_key_here"
npx -y rollin-mcp-server
```

Pipe into any MCP-compatible process.

</details>

## Tools

### `search_locations`
Search accessible venues by location, query, and accessibility criteria.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | no | Search query (name, cuisine, type) |
| `lat` | number | no | Latitude for location-based search |
| `lng` | number | no | Longitude for location-based search |
| `radius` | number | no | Search radius in miles (default: 10) |
| `min_score` | number | no | Minimum accessibility score 0-100 |
| `limit` | number | no | Max results (default: 20) |
| `lighting` | string | no | Filter by lighting: `bright`, `moderate`, `dim` |

### `get_location_details`
Full accessibility breakdown for a single venue.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Location ID from search results |

Returns: score (0-100), 6 tracked features (`wheelchair_entry`, `accessible_restroom`, `level_entry`, `parking`, `elevator`, `wide_aisles`), environment/lighting data, verification status, community feedback.

### `list_regions`
All coverage areas with location counts. No parameters.

### `submit_feedback`
Submit accessibility corrections through conversation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `location_id` | string | yes | Location ID |
| `type` | string | yes | Feedback type |
| `message` | string | yes | Description of correction |

### `check_health`
Verify the API is up. No parameters.

## Example Prompts

Once configured, just ask naturally:

- *"Find wheelchair accessible Italian restaurants near Times Square"*
- *"What's the accessibility score for that spot?"*
- *"Which cities does ROLLIN cover?"*
- *"That restaurant has a ramp now — can you update it?"*

## Coverage

**15 US states &middot; 48 regions &middot; 105,000+ scored locations**

| State | Regions |
|-------|---------|
| New York | NYC Metro, Hudson Valley, Long Island, Capital Region, Finger Lakes, Western NY, Adirondacks |
| California | LA Metro, SF Bay Area, San Diego, Sacramento, Central Coast, Inland Empire |
| Florida | Miami, Orlando, Tampa Bay, Jacksonville, Southwest FL |
| Massachusetts | Boston Metro, Western MA |
| Illinois | Northern IL, West-Central IL, Central IL, Southern IL |
| Colorado | Northeast CO, Northwest CO, Southeast CO, Southwest CO |
| Texas | DFW, Houston, Austin, San Antonio, El Paso |
| Ohio | Cleveland, Cincinnati, Columbus, Northwest OH |
| Idaho | Northern ID, Boise Metro |
| New Jersey | Statewide |
| Pennsylvania | Statewide |
| Washington DC | DC Metro |
| Arizona | Phoenix, Tucson |
| Washington | Seattle Metro |
| Oregon | Portland Metro |

## Pricing

The MCP server uses your ROLLIN API key. Same tiers, same limits.

| | Free | Developer | Business |
|---|---|---|---|
| **Requests** | 1,000/mo | 50,000/mo | 500,000/mo |
| **Price** | $0 | $29/mo | $149/mo |

**[Get your free key →](https://joinrollin.com/portal.html)**

## Links

| | |
|---|---|
| MCP Server Page | [joinrollin.com/mcp](https://joinrollin.com/mcp) |
| API Documentation | [joinrollin.com/developers](https://joinrollin.com/developers.html) |
| Developer Portal | [joinrollin.com/portal](https://joinrollin.com/portal.html) |
| API Status | [joinrollin.com/status](https://joinrollin.com/status.html) |
| Python SDK | [stainless-commons/rollin-python](https://github.com/stainless-commons/rollin-python) |
| MCP Protocol Spec | [modelcontextprotocol.io](https://modelcontextprotocol.io) |

## License

MIT — [Stackline Studio](https://stacklinestudio.com)
