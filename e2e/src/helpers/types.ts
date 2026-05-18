/**
 * Shared types for E2E fixtures and helpers.
 */
export interface Fixtures {
  token: string;
  groupId: number;
  groupPath: string;
  projectId: number;
  projectPath: string;
  issueIid: number;
  mergeRequestIid: number;
  branchName: string;
  labelName: string;
  milestoneName: string;
  wikiPageSlug: string;
}

/**
 * MCP tool call result — accepts either SDK variant.
 *
 * `callTool()` returns a discriminated union: one variant has `content`
 * (CallToolResult), the other has `toolResult: unknown` (legacy/streaming).
 * Helpers assume the content variant and throw if it's missing.
 *
 * This shape is loose enough for both variants but more specific than `any`,
 * which preserves IDE help on `.content[i].type/.text` for callers.
 */
export type ToolResult = {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

function assertContent(result: ToolResult): Array<{ type: string; text?: string }> {
  if (!result.content || !Array.isArray(result.content)) {
    throw new Error('Tool result has no content array (likely a toolResult-variant response)');
  }
  return result.content;
}

/**
 * Extract text from an MCP tool result.
 */
export function extractText(result: ToolResult): string {
  const content = assertContent(result);
  const item = content.find((c) => c.type === 'text');
  if (!item || !item.text) throw new Error('No text content in tool result');
  return item.text;
}

/**
 * Parse JSON text from an MCP tool result.
 * Tools may return multiple text items (summary + JSON data).
 * This finds the last text item that is valid JSON.
 */
export function extractJson<T = unknown>(result: ToolResult): T {
  const content = assertContent(result);
  const textItems = content.filter((c) => c.type === 'text' && c.text);
  // Try from last to first — JSON data is typically the last item
  for (let i = textItems.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(textItems[i].text!) as T;
    } catch {
      continue;
    }
  }
  throw new Error(`No valid JSON in tool result. Content: ${textItems.map(t => t.text).join(' | ')}`);
}
