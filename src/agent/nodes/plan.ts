import type {AgentState} from '../state'
import { SystemMessage } from '@langchain/core/messages'
import {model} from '../llm' 

/**
 * 从这里其实可以看出提示词 prompt 的重要性！！
 */

const PLAN_PROMPT = `
你是一个 codebase agent 的规划器 (Planner)。

你的任务：
- 根据用户的问题，生成一个【最小且足够】的代码阅读计划
- 计划应当是有限的 (通常不超过10步)
- 每一步必须是可执行的文件或目录

可用做类型：
- read <file> : 读取文件内容
- list <directory> : 获取目录下的文件列表

规则：
1. 不要阅读不必要的文件
2. 不要递归浏览整个项目
3. 如果仅通过 package.json 就能回答，就加入更多步骤
4. 不要回到用户问题
5. 仅输出 PLAN，格式如下：

PLAN:
- read package.json
- list src/commands
`

export const PlanNode = async (state: AgentState) => {

  const response = await model.invoke([
    new SystemMessage(PLAN_PROMPT),
    ...state.messages
  ])

  const content = String(response.content)

  const plan = content
    .split('\n')
    .map(line => line.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^-\s*/, ''))

  console.error('==== PLAN NODE OUTPUT ====', plan)
  return {
    messages: [response],
    plan
  }
}