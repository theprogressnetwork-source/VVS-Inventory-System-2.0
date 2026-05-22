#!/usr/bin/env bash
# ==============================================================================
# 🚀 VVS OPENSRC EXPLORER & SWARM R&D UTILITY
# ==============================================================================
# Author: Senna (Sovereign Partner & Principal Orchestrator)
# Version: One Point Zero (1.0.0)
# Purpose: High-speed, localized open-source code audit & pattern extraction.
# ==============================================================================

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Text formatting
BOLD='\033[1m'
UNDERLINE='\033[4m'

# Core Paths
VVS_ROOT="/home/neo/ANTIGRAVITY WORK FOLDERS/VVS"
FRONTEND_DIR="${VVS_ROOT}/VvsImsFrontend"
PACKAGE_JSON="${FRONTEND_DIR}/package.json"

# Print Header
print_header() {
    echo -e "${BLUE}${BOLD}==============================================================================${NC}"
    echo -e "${CYAN}${BOLD}👑 SENNA SWARM NEXUS: OPENSRC EXPLORER UTILITY${NC} (Version: One Point Zero)"
    echo -e "${BLUE}==============================================================================${NC}"
}

# Print Usage
print_usage() {
    print_header
    echo -e "Usage: ${BOLD}./opensrc-explorer.sh [COMMAND] [ARGS...]${NC}\n"
    echo -e "${YELLOW}${BOLD}Core Commands:${NC}"
    echo -e "  ${GREEN}list${NC}                           - List all globally cached packages with metadata."
    echo -e "  ${GREEN}inspect <pkg>${NC}                  - Show directory structure and file analysis of a package."
    echo -e "  ${GREEN}search <pkg> <pattern>${NC}         - High-velocity ripgrep search within clean source code."
    echo -e "  ${GREEN}find-file <pkg> <glob>${NC}         - Find files matching a glob pattern (e.g. '*.ts', '*.cs')."
    echo -e "  ${GREEN}view-file <pkg> <rel_path>${NC}     - View a specific file with line numbers."
    echo -e "  ${GREEN}auto-fetch-frontend${NC}            - Automatically pre-fetch key Angular nineteen frontend dependencies."
    echo -e "  ${GREEN}extract-patterns <platform>${NC}    - Fetch and audit standard SDK templates for Greenfield rebuild."
    echo -e "\n${YELLOW}${BOLD}Supported Package Identifiers (npm, PyPI, GitHub):${NC}"
    echo -e "  • npm package:      ${CYAN}zod${NC} or ${CYAN}npm:ngx-toastr${NC}"
    echo -e "  • PyPI package:     ${CYAN}pypi:requests${NC}"
    echo -e "  • GitHub repo:      ${CYAN}owner/repo${NC} (e.g., ${CYAN}LionMane1017/opensrc${NC})"
    echo -e "=============================================================================="
}

# Ensure opensrc is available
check_opensrc() {
    if ! command -v opensrc &> /dev/null; then
        echo -e "${RED}${BOLD}❌ ERROR:${NC} 'opensrc' CLI tool is not installed globally."
        echo -e "Please run: ${YELLOW}npm install -g opensrc${NC}"
        exit 1
    fi
}

# Resolve package path
get_package_path() {
    local pkg=$1
    local path
    path=$(opensrc path "$pkg" 2>/dev/null)
    if [[ -z "$path" || ! -d "$path" ]]; then
        # Try fetching it
        echo -e "${YELLOW}🔄 Cache miss. Fetching source for '${pkg}'...${NC}" >&2
        path=$(opensrc path "$pkg")
    fi
    echo "$path"
}

# Command: List Cached Packages
cmd_list() {
    check_opensrc
    print_header
    echo -e "${GREEN}${BOLD}📋 Listing Cached Sources from ~/.opensrc/repos/:${NC}\n"
    opensrc list
}

# Command: Inspect Package
cmd_inspect() {
    check_opensrc
    local pkg=$1
    if [[ -z "$pkg" ]]; then
        echo -e "${RED}❌ Error: Please specify a package or repository name.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}🔍 Resolving and analyzing '${pkg}'...${NC}"
    local path
    path=$(get_package_path "$pkg")
    
    if [[ -z "$path" || ! -d "$path" ]]; then
        echo -e "${RED}❌ Error: Failed to resolve path for '${pkg}'.${NC}"
        exit 1
    fi

    print_header
    echo -e "${GREEN}${BOLD}📦 Package:${NC} ${BOLD}${pkg}${NC}"
    echo -e "${GREEN}${BOLD}📂 Cached Path:${NC} ${CYAN}${path}${NC}"
    echo -e "${GREEN}${BOLD}📊 File Count by Extension:${NC}"
    
    # Count file types
    find "$path" -type f | grep -E "\.[a-zA-Z0-9]+$" | awk -F. '{print $NF}' | sort | uniq -c | sort -rn | head -n 10
    
    echo -e "\n${GREEN}${BOLD}📁 Directory Structure (Top Level):${NC}"
    ls -lh "$path" | head -n 15
}

# Command: Search Code
cmd_search() {
    check_opensrc
    local pkg=$1
    local pattern=$2
    if [[ -z "$pkg" || -z "$pattern" ]]; then
        echo -e "${RED}❌ Error: Usage: ./opensrc-explorer.sh search <pkg> <pattern>${NC}"
        exit 1
    fi

    local path
    path=$(get_package_path "$pkg")
    if [[ -z "$path" || ! -d "$path" ]]; then
        echo -e "${RED}❌ Error: Failed to resolve package path.${NC}"
        exit 1
    fi

    print_header
    echo -e "${GREEN}${BOLD}🔍 Searching for pattern '${pattern}' in '${pkg}':${NC}\n"
    if command -v rg &> /dev/null; then
        rg --color=always -n "$pattern" "$path" | head -n 50
    else
        grep -rn --color=always "$pattern" "$path" | head -n 50
    fi
}

# Command: Find Files
cmd_find_file() {
    check_opensrc
    local pkg=$1
    local glob=$2
    if [[ -z "$pkg" || -z "$glob" ]]; then
        echo -e "${RED}❌ Error: Usage: ./opensrc-explorer.sh find-file <pkg> <glob>${NC}"
        exit 1
    fi

    local path
    path=$(get_package_path "$pkg")
    if [[ -z "$path" || ! -d "$path" ]]; then
        echo -e "${RED}❌ Error: Failed to resolve package path.${NC}"
        exit 1
    fi

    print_header
    echo -e "${GREEN}${BOLD}📁 Finding files matching '${glob}' in '${pkg}':${NC}\n"
    find "$path" -name "$glob" | sed "s|$path/||" | head -n 50
}

# Command: View File
cmd_view_file() {
    check_opensrc
    local pkg=$1
    local rel_path=$2
    if [[ -z "$pkg" || -z "$rel_path" ]]; then
        echo -e "${RED}❌ Error: Usage: ./opensrc-explorer.sh view-file <pkg> <rel_path>${NC}"
        exit 1
    fi

    local path
    path=$(get_package_path "$pkg")
    if [[ -z "$path" || ! -d "$path" ]]; then
        echo -e "${RED}❌ Error: Failed to resolve package path.${NC}"
        exit 1
    fi

    local full_path="${path}/${rel_path}"
    if [[ ! -f "$full_path" ]]; then
        echo -e "${RED}❌ Error: File not found at '${full_path}'${NC}"
        exit 1
    fi

    print_header
    echo -e "${GREEN}${BOLD}📄 Viewing File:${NC} ${CYAN}${rel_path}${NC} inside ${BOLD}${pkg}${NC}\n"
    nl -ba -w4 -s": " "$full_path" | head -n 300
}

# Command: Auto-fetch Angular Frontend Dependencies
cmd_auto_fetch_frontend() {
    check_opensrc
    print_header
    echo -e "${YELLOW}📂 Scanning package.json at ${PACKAGE_JSON}...${NC}"
    
    if [[ ! -f "$PACKAGE_JSON" ]]; then
        echo -e "${RED}❌ Error: package.json not found at '${PACKAGE_JSON}'.${NC}"
        exit 1
    fi

    # Key packages we want to pre-fetch for R&D supremacy
    local targets=(
        "@ngx-translate/core"
        "@ng-select/ng-select"
        "@ng-bootstrap/ng-bootstrap"
        "ngx-toastr"
        "ag-grid-angular"
        "rxjs"
    )

    echo -e "${GREEN}${BOLD}🚀 Pre-fetching core frontend dependencies for localized R&D...${NC}\n"
    for pkg in "${targets[@]}"; do
        echo -e "${CYAN}🔄 Fetching npm:${pkg}...${NC}"
        local start_time=$SECONDS
        local resolved_path
        resolved_path=$(opensrc path "npm:${pkg}" --cwd "$FRONTEND_DIR" 2>/dev/null)
        local duration=$((SECONDS - start_time))
        if [[ -n "$resolved_path" ]]; then
            echo -e "${GREEN}✅ Cached at:${NC} ${resolved_path} (${duration}s)"
        else
            echo -e "${RED}❌ Failed to fetch ${pkg}${NC}"
        fi
        echo "--------------------------------------------------------"
    done
    echo -e "${GREEN}${BOLD}🎉 Frontend R&D dependency pre-fetching complete!${NC}"
}

# Command: Extract Patterns (Shopify / SP-API templates)
cmd_extract_patterns() {
    check_opensrc
    local platform=$1
    if [[ -z "$platform" ]]; then
        echo -e "${RED}❌ Error: Please specify a platform ('shopify' or 'amazon' or 'bestbuy').${NC}"
        exit 1
    fi

    print_header
    if [[ "$platform" == "shopify" ]]; then
        echo -e "${GREEN}${BOLD}🏛️ Shopify Integration R&D Pattern Extraction:${NC}"
        # We fetch the highly robust C# Shopify SDK to extract their typed HTTP client and rate-limiting patterns
        local repo="nozzlegear/shopify-csharp-sdk"
        echo -e "${YELLOW}🔄 Fetching popular repository '${repo}'...${NC}"
        local path
        path=$(get_package_path "$repo")
        echo -e "${GREEN}✅ Repository local path:${NC} ${path}"
        echo -e "\n${CYAN}📄 Key Shopify Service architecture files found:${NC}"
        find "$path" -name "*Service*.cs" -o -name "*Client*.cs" | sed "s|$path/||" | head -n 15
        
    elif [[ "$platform" == "amazon" ]]; then
        echo -e "${GREEN}${BOLD}🏛️ Amazon SP-API Integration R&D Pattern Extraction:${NC}"
        # We fetch SellingPartnerAPI Amazon SDK repo to study auth signature signing
        local repo="abuzer/SellingPartnerAPI.Amazon.SDK"
        echo -e "${YELLOW}🔄 Fetching popular repository '${repo}'...${NC}"
        local path
        path=$(get_package_path "$repo")
        echo -e "${GREEN}✅ Repository local path:${NC} ${path}"
        echo -e "\n${CYAN}📄 SP-API authentication and client files found:${NC}"
        find "$path" -name "*Auth*.cs" -o -name "*Sign*.cs" -o -name "*Client*.cs" | sed "s|$path/||" | head -n 15
        
    else
        echo -e "${RED}❌ Unsupported platform. Please choose 'shopify' or 'amazon'.${NC}"
    fi
}

# Main Execution Dispatcher
case "$1" in
    list)
        cmd_list
        ;;
    inspect)
        cmd_inspect "$2"
        ;;
    search)
        cmd_search "$2" "$3"
        ;;
    find-file)
        cmd_find_file "$2" "$3"
        ;;
    view-file)
        cmd_view_file "$2" "$3"
        ;;
    auto-fetch-frontend)
        cmd_auto_fetch_frontend
        ;;
    extract-patterns)
        cmd_extract_patterns "$2"
        ;;
    *)
        print_usage
        ;;
esac
