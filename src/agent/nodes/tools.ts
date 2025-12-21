import type { AgentState } from '../state'
import { AIMessage, ToolMessage} from '@langchain/core/messages'
import { toolsMap } from '../tools'

// 创建 tool 工具节点
export const toolNode = async (state: AgentState) => {
  console.error('==== LLM NODE INPUT ====')
  // console.error('toolNode', state)
  const last = state.messages.at(-1)

  // 根据 plan 计划调用工具；目前的节点顺序逻辑是 plan -> llm -> tool 。因为经过 llm ，所以调用结构还是存在的
  

  if (!last || !AIMessage.isInstance(last) || last.tool_calls?.length === 0) return {messages: []};

  const results: ToolMessage[] = []
  for (const call of last.tool_calls ?? []) { 
    const tool = toolsMap[call.name]
    // 使用生成的参数执行工具
    // @ts-ignore
    const too_result = await tool.invoke(call)
    results.push(too_result)
  }
  return {messages: results}
}