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

/**
 * Extract `items` from a list-* tool response that uses the unified
 * `{count: number, items: T[]}` envelope shape (all `list_*` tools since
 * 0.10.0 and `search_repositories`). Returns the destructured wrapper
 * for callers that need both `count` and `items`; most call sites use
 * the `.items` accessor directly:
 *
 *   const { items } = extractListItems<{ iid: number }>(result);
 *   expect(items.some(i => i.iid === ...)).toBe(true);
 *
 * Asserts the wrapper shape at runtime so a mis-shaped response fails
 * loudly here rather than producing a confusing downstream TypeError.
 */
export function extractListItems<T = unknown>(result: ToolResult): { count: number; items: T[] } {
  const data = extractJson<{ count: number; items: T[] }>(result);
  if (typeof data?.count !== 'number' || !Array.isArray(data?.items)) {
    // Best-effort preview - JSON.stringify can throw on BigInt/circular,
    // fall back to a String() coercion so the wrapper error always wins.
    let preview: string;
    try {
      preview = JSON.stringify(data)?.slice(0, 200) ?? String(data);
    } catch {
      preview = String(data);
    }
    throw new Error(`Expected list response shape {count: number, items: T[]}. Got: ${preview}`);
  }
  return data;
}
