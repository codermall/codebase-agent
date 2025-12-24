import type { AgentState } from '../state'
import { AIMessage, ToolMessage} from '@langchain/core/messages'
import { toolsMap, TOOLS_SCHEMA } from '../tools'
import { resolveSafePath } from '../utils/safePath'
import { normalizeToolResult } from '../utils/safeResultTool'

const ALLOWED_TOOLS = new Set(Object.keys(toolsMap))
const MAX_TOTAL_TOOL_CALLS = 20

// 创建 tool 工具节点
export const toolNode = async (state: AgentState) => {
  console.error('==== Tool NODE INPUT ====', )
  // console.error('toolNode', state)
  const last = state.messages.at(-1)

  if (!last || !AIMessage.isInstance(last) || last.tool_calls?.length === 0) return {messages: []};

  const tool_calls = last.tool_calls!
  // ？
  if(tool_calls.length > 3) {

  }

  // 参数的校验、执行结果的校验、工具的校验 都是有必要的，不能将所有的内容交给 tool 本身决定，他只是承接 llm 的参数然后执行
  // 如果不校验，比如，某一次的结果并不是 llm 想要的，那这不是报错了吗？


  const results: ToolMessage[] = []
  const currentVisitedPaths = new Set()
  for (const call of last.tool_calls ?? []) { 
    // 预算限制
    if (state.toolUsage.count >= MAX_TOTAL_TOOL_CALLS) {
      return {
        messages: [
          ...results,
          new ToolMessage({
            tool_call_id: call.id!,
            content: 'Error: Tool call limit reached.'
          })
        ]
      }
    }
    // 1. 白名单 - 校验工具是否在允许范围内
    if (!ALLOWED_TOOLS.has(call.name)) {
      return {
        messages: [
          new ToolMessage({
            tool_call_id: call.id!,
            content: `Error: Tool "${call.name}" is not allowed.`,
          })
        ]
      }
    }
    // 2. 校验参数结构
    let args: any
    try {
      args = TOOLS_SCHEMA[call.name].parse(call.args) // schema 执行校验，此时就不是描述了
    } catch (err) {
      return {
        messages: [
          new ToolMessage({
            tool_call_id: call.id!,
            content: `Error: Invalid tool arguments. ${String(err)}`
          })
        ]
      }
    }

    // 3. 安全路径校验
    let safePath: string
    try {
      safePath = resolveSafePath(args.dir || args.filePath)
    } catch (err) {
      return {
        messages: [
          new ToolMessage({
            tool_call_id: call.id!,
            content: `Error: Unsafe file path. ${String(err)}`
          })
        ]
      }
    }

    // 路径重复访问？
    if (state.toolUsage.visitedPaths.has(safePath)) {
      return {
        messages: [
          new ToolMessage({
            tool_call_id: call.id!,
            content: `Error: Path "${safePath}" has already been visited.`,
          })
        ]
      }
    } else {
      currentVisitedPaths.add(safePath) // 保存
    }

    const tool = toolsMap[call.name]
    // 使用生成的参数执行工具
    // @ts-ignore
    const too_result = await tool.invoke({
      ...call,
      args,
    })
    // tool_result 校验
    results.push(normalizeToolResult(too_result))
  }

  return {
    ...state,
    messages: results, 
    toolUsage: { 
      count: state.toolUsage.count + results.length,
      visitedPaths: new Set([
        ...state.toolUsage.visitedPaths, // 上一次的
        ...currentVisitedPaths // 本次的
      ])
    }
  }
}