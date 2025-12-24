import { ToolMessage } from '@langchain/core/messages'

export function normalizeToolResult(result: ToolMessage): ToolMessage {
  let content = result.content

  if (typeof content !== 'string') {
    try {
      content = JSON.stringify(content, null, 2)
    } catch {
      content = String(content)
    }
  }

  return new ToolMessage({
    tool_call_id: result.tool_call_id,
    content,
  })
}
