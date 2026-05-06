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
 * MCP tool call result — accepts the union type from callTool().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolResult = any;

/**
 * Extract text from an MCP tool result.
 */
export function extractText(result: ToolResult): string {
  const r = result as { content: Array<{ type: string; text?: string }> };
  const item = r.content.find((c) => c.type === 'text');
  if (!item || !item.text) throw new Error('No text content in tool result');
  return item.text;
}

/**
 * Parse JSON text from an MCP tool result.
 * Tools may return multiple text items (summary + JSON data).
 * This finds the last text item that is valid JSON.
 */
export function extractJson<T = unknown>(result: ToolResult): T {
  const r = result as { content: Array<{ type: string; text?: string }> };
  const textItems = r.content.filter((c) => c.type === 'text' && c.text);
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
