import type { AgentState } from '../state'
import {model} from '../llm'
import {tools} from '../tools'
import {systemMessage} from '../prompt'

// 模型绑定工具
const modelWithTools = model.bindTools(tools)

// 创建 llm 节点
export const llmNode = async (state: AgentState) => {
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