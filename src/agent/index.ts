import { StateGraph, END, START, MessagesZodMeta} from '@langchain/langgraph'
import {AIMessage, ToolMessage} from '@langchain/core/messages'
import {model} from './llm'
import {toolsMap, tools} from './tools'
import {systemMessage} from './prompt'
import {CodebaseAgentState} from './state'
import {shouldContinue} from './shouldContinue'

// 模型绑定工具
const modelWithTools = model.bindTools(tools)

// 创建 llm 节点
const llmNode = async (state: any) => {
  console.error('==== LLM NODE INPUT ====')
  // console.error('llmNode', state)

  const res = await modelWithTools.invoke([
    systemMessage,
    ...state.messages
  ])
// res.tool_calls
// [
//   { name: 'listFile', args: { dir: '.' }, id: 'call_1' },
//   { name: 'readFile', args: { filePath: './index.ts' }, id: 'call_2' }
// ]
  console.error('==== LLM NODE OUTPUT ====')
  console.error(res.content)
  return {
    messages: [res]
  }
}

// 创建 tool 工具节点
const toolNode = async (state: any) => {
  console.error('==== LLM NODE INPUT ====')
  // console.error('toolNode', state)
  const last = state.messages.at(-1)
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


export function createCodebaseAgent() {
  const graph = new StateGraph(CodebaseAgentState)
    .addNode('llm', llmNode)
    .addNode('tool', toolNode)
    .addEdge(START,'llm')
    .addConditionalEdges('llm', shouldContinue, ['tool', END])
    .addEdge('tool', 'llm')
  
  return graph.compile()
}

// ======== 至此， 我就拥有了一个 LangGraph Agent 了 ==========

/**
 * Agent 并不是 LLM
 * Prompt 是 Agent 的行为策略
 * Tool 是 Agent 的行为执行者
 */
