#!/bin/bash

# Simple test script to verify the MCP server works with pagination
# This assumes the server is running and connected to Claude Code

echo "Testing zep_get_memory with pagination parameters..."
echo ""
echo "Test 1: Get last 20 messages from 'global' session"
echo "Test 2: Get last 50 messages from 'esme' session with assistant filter"
echo "Test 3: Get last 10 messages from any session"
echo ""
echo "NOTE: This script is just documentation. Actual testing requires:"
echo "1. Restart Claude Code to reload the MCP server"
echo "2. Call the tools from within Claude Code conversation"
echo ""
echo "Example calls to test:"
echo "  mcp__zep__zep_get_memory(session_id='global', lastn=20)"
echo "  mcp__zep__zep_get_memory(session_id='esme', lastn=50, role_filter='assistant')"
echo "  mcp__zep__zep_get_memory(session_id='esme', lastn=10)"
