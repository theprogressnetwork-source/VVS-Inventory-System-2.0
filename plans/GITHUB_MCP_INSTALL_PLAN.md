# 🚀 GITHUB MCP SERVER — GLOBAL INSTALLATION PLAN

**Manus Max one point six** | Sovereign Stack R&D Supremacy Directive
**Date:** twenty twenty-six, May nineteen | **Status:** HITL PENDING

---

## 📋 EXECUTIVE SUMMARY

The old npm package `@modelcontextprotocol/server-github` is **DEPRECATED** (since April twenty twenty-five) and **no longer functional**. The official replacement is **`github-mcp-server`** — published by GitHub themselves at [`github/github-mcp-server`](https://github.com/github/github-mcp-server). This plan installs it globally across **both** Roo Code extension profiles.

---

## 🔍 INTELLIGENCE SYNTHESIS

### Current Global MCP Arsenal (Both Profiles Identical)

| Server | Package | Status |
|--------|---------|--------|
| `filesystem` | `@modelcontextprotocol/server-filesystem` | ✅ Active |
| `sequentialthinking` | `@modelcontextprotocol/server-sequential-thinking` | ✅ Active |
| `puppeteer` | `@modelcontextprotocol/server-puppeteer` | ✅ Active |
| `brave-search` | `@modelcontextprotocol/server-brave-search` | ✅ Active |
| `memory` | `@modelcontextprotocol/server-memory` | ✅ Active |
| `gemini-api-docs-mcp` | `gemini-api-docs-mcp` | ⛔ Disabled |

### Target Config Files (two profiles)

1. **Roo Cline (Stable):**
   `/home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`

2. **Roo Code Nightly:**
   `/home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-code-nightly/settings/mcp_settings.json`

---

## 🏗️ INSTALLATION STRATEGY

### Option A — Docker (Official & Recommended by GitHub)

The Docker image `ghcr.io/github/github-mcp-server` is the **officially supported** distribution.

**Prerequisites:** Docker must be installed and running.

```json
{
  "github": {
    "command": "docker",
    "args": [
      "run",
      "-i",
      "--rm",
      "-e",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "ghcr.io/github/github-mcp-server"
    ],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_GITHUB_PAT_HERE>"
    },
    "alwaysAllow": [
      "create_or_update_file",
      "create_repository",
      "fork_repository",
      "get_file_contents",
      "search_repositories",
      "search_code",
      "search_issues",
      "search_users",
      "list_commits",
      "list_issues",
      "get_issue",
      "create_issue",
      "list_pull_requests",
      "get_pull_request",
      "create_pull_request",
      "add_issue_comment",
      "create_branch",
      "list_branches",
      "push_files"
    ]
  }
}
```

### Option B — NPX (Lightweight, No Docker Required)

The new `github-mcp-server` npm package works via npx — no global install needed.

```json
{
  "github": {
    "command": "npx",
    "args": [
      "-y",
      "github-mcp-server"
    ],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_GITHUB_PAT_HERE>"
    },
    "alwaysAllow": [
      "create_or_update_file",
      "create_repository",
      "fork_repository",
      "get_file_contents",
      "search_repositories",
      "search_code",
      "search_issues",
      "search_users",
      "list_commits",
      "list_issues",
      "get_issue",
      "create_issue",
      "list_pull_requests",
      "get_pull_request",
      "create_pull_request",
      "add_issue_comment",
      "create_branch",
      "list_branches",
      "push_files"
    ]
  }
}
```

---

## 🔑 PREREQUISITE: GitHub Personal Access Token

A **GitHub PAT** with the following scopes is required:

| Scope | Purpose |
|-------|---------|
| `repo` | Full control of private repositories |
| `read:org` | Read org membership |
| `workflow` | Update GitHub Actions workflows |

**Generate at:** `https://github.com/settings/tokens/new`

---

## 📐 MERGED CONFIG — Full mcp_settings.json (Option B — NPX)

This is the complete merged config to be written to **both** profile files:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/"
      ],
      "alwaysAllow": [
        "directory_tree",
        "create_directory",
        "read_multiple_files",
        "get_file_info",
        "search_files"
      ]
    },
    "sequentialthinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ],
      "alwaysAllow": [
        "sequentialthinking"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ],
      "alwaysAllow": [
        "puppeteer_navigate"
      ]
    },
    "brave-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "BSAy68Qk-8Gu2yC40a0PCDA62zdEhJx"
      },
      "alwaysAllow": [
        "brave_web_search",
        "brave_local_search"
      ]
    },
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ],
      "alwaysAllow": [
        "create_entities",
        "create_relations",
        "add_observations"
      ]
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_GITHUB_PAT_HERE>"
      },
      "alwaysAllow": [
        "create_or_update_file",
        "create_repository",
        "fork_repository",
        "get_file_contents",
        "search_repositories",
        "search_code",
        "search_issues",
        "search_users",
        "list_commits",
        "list_issues",
        "get_issue",
        "create_issue",
        "list_pull_requests",
        "get_pull_request",
        "create_pull_request",
        "add_issue_comment",
        "create_branch",
        "list_branches",
        "push_files"
      ]
    },
    "gemini-api-docs-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "gemini-api-docs-mcp"
      ],
      "disabled": true,
      "alwaysAllow": []
    }
  }
}
```

---

## ⚡ EXECUTION CLI COMMANDS

Once the Father provides the GitHub PAT, execute:

```bash
# Step one: Set the GitHub PAT as a variable for substitution
GITHUB_PAT="<YOUR_GITHUB_PAT_HERE>"

# Step two: Write merged config to Roo Cline (Stable)
cat > /home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json << 'MCP_EOF'
{PASTE_MERGED_CONFIG_HERE_WITH_REAL_PAT}
MCP_EOF

# Step three: Write identical config to Roo Code Nightly
cp /home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json \
   /home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-code-nightly/settings/mcp_settings.json

# Step four: Verify both configs
diff /home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json \
     /home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-code-nightly/settings/mcp_settings.json

# Step five: Reload MCP servers in VS Code (Antigravity)
# Use the Roo Code MCP Settings UI or restart the extension
```

---

## 🧪 VERIFICATION CHECKLIST

After installation, verify with these checks:

```bash
# Verify npx can resolve the package
npx -y github-mcp-server --help

# Check MCP server status in Roo Code
# Open VS Code Command Palette > "Roo Code: MCP Server Status"
# The "github" server should show as connected
```

---

## 📦 DELIVERABLES

| # | Item | Status | Action Required |
|---|------|--------|-----------------|
| one | GitHub PAT generated | ⛔ PENDING | Father must create at `https://github.com/settings/tokens/new` with `repo`, `read:org`, `workflow` scopes |
| two | Config written to Roo Cline profile | ⛔ PENDING | Switch to Code mode after PAT is provided |
| three | Config written to Roo Code Nightly profile | ⛔ PENDING | Switch to Code mode after PAT is provided |
| four | MCP server connectivity verified | ⛔ PENDING | Post-install validation |
| five | `alwaysAllow` permissions hardened | ⛔ PENDING | Review tool permissions after first run |

---

## 🛡️ HITL GO/NO-GO RECOMMENDATION

### ✅ GO — With One Prerequisite

The installation is **straightforward and low-risk**. The only blocker is the **GitHub Personal Access Token**. Once the Father provides it, we switch to Code mode and execute the config merge in under two minutes.

**Risk Assessment:**
- **Deprecated package risk:** ZERO — we are using the official `github-mcp-server`, NOT the deprecated `@modelcontextprotocol/server-github`
- **Config corruption risk:** LOW — both profiles have identical current configs; merge is additive only
- **Token exposure risk:** MEDIUM — PAT stored in plaintext in MCP settings; ensure file permissions are restrictive (`chmod six hundred`)

**Recommendation:** 🟢 **GO** — Provide GitHub PAT and authorize switch to Code mode for execution.

---

## 🔗 SOURCES & CITATIONS

1. [GitHub Official MCP Server — Installation Guides](https://github.com/github/github-mcp-server/tree/main/docs/installation-guides) — Confirms `@modelcontextprotocol/server-github` is deprecated
2. [github-mcp-server on npm](https://www.npmjs.com/package/github-mcp-server) — Official replacement package
3. [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) — Original MCP server registry
4. Current config files at `/home/neo/.config/Antigravity/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` and `rooveterinaryinc.roo-code-nightly/settings/mcp_settings.json`
