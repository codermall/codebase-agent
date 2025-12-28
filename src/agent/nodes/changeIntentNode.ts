
/**
  意图层比较重要的是：
  - 不要越权去“确认事实”
  - 这里仅仅是猜测，而不需要确认
  - 但是可以进行标记，比如 confidence: 'high' | 'medium' | 'low'

  意图层需要做3件事：
  1. 总结用户变更意图「summary/motivation」
  2. 抽取用户显示给出的路径或文件线索
  3. 生成 searchHypothesis 搜索假设层
 */

import type {AgentState, ChangeIntent} from '../state'

import { SystemMessage } from '@langchain/core/messages'
import {model} from '../llm'


export async function changeIntentNode(state: AgentState) {
  const message = [
    new SystemMessage(`
      你是一个代码库变更意图分析助手。
      任务: 
      - 从用户的自然语言中, 生成一个【变更意图 + 搜索假设】对象

      请注意:
      1. 不需要确认任何文件是否真实存在
      2. 所有路径、文件名、目录都只是"搜索线索"
      3. 输出将用于后续的代码库验证与影响分析
      4. 不要写代码

      请输出以下字段:

     【意图层】
      - summary: 对话意图总结, 用一句话概括用户的变更意图
      - motivation: 当前对话的动机, 解释为什么要进行这个变更
      - suspectedFiles: 用户可能直接提到的文件或路径（如果没有则为空数组）

     【搜索假设层】
      - fileNameHints: 可能的组件名、文件名、符号名
      - dirNameHints: 可能的目录或逻辑区域（如 components、icons 等概念性区域）
      - entryHints: 可能引用该组件的入口（如 App、Layout、Page 等）
      - semanticHints: 可用于搜索的语义关键词（偏抽象，不是业务词）

     【整体】
      - confidence: 信任度, 可选值有 'high' | 'medium' | 'low'，根据用户的输入，来判断这里的信任度，比如用户可能就没有给确定的路径，那这里的信任度就比较低
      
      返回示例:

      请严格按照以下 JSON 格式返回【注意: 不要有其他内容, 下一步将会对这个输出做直接使用, 比如: JSON.parse(res.content), 千万不需要携带 \`\`\`json 或者一些解释以及其他内容, 否则会解析失败】:
      {
        "summary": "...",
        "motivation": "...",
        "suspectedFiles": ["file1", "file2", "..."]
        "searchHypothesis": {
          "fileNameHints": ["file1", "file2", "..."],
          "dirNameHints": ["dir1", "dir2", "..."],
          "entryHints": ["entry1", "entry2", "..."],
          "semanticHints": ["semantic1", "semantic2", "..."]
        },
        "confidence": "..."
      }
    `),
    ...state.messages,
  ]
  const res = await model.invoke(message)
  const changeIntent: ChangeIntent = JSON.parse(res.content as string || '{}') as unknown as ChangeIntent
  console.error('==== CHANGE INTENT NODE OUTPUT ====', changeIntent)

  return {
    changeIntent,
  }

}

/**
   {
      summary: '用户希望将位于 packages/cmdb-app/src/components 目录下的 403 组件进行抽离。',
      motivation: '用户意图重构代码，将特定的 403 错误页面组件从其当前位置独立出来，可能是为了提升组件的可复用性、便于维护或遵循新的架构规范。',
      suspectedFiles: [
        'packages/cmdb-app/src/components/403.js',
        'packages/cmdb-app/src/components/403.jsx',
        'packages/cmdb-app/src/components/403.ts',
        'packages/cmdb-app/src/components/403.tsx',
        'packages/cmdb-app/src/components/403/index.js',
        'packages/cmdb-app/src/components/403/index.ts'
      ],
      searchHypothesis: {
        fileNameHints: [ '403', 'Forbidden', 'Error403', 'AccessDenied' ],
        dirNameHints: [ 'components', 'pages', 'views', 'errors', 'common', 'shared' ],
        entryHints: [ 'App', 'Layout', 'Router', 'ErrorBoundary', 'Page' ],
        semanticHints: [
          'error page',
          'forbidden',
          'access denied',
          'http status',
          'component extraction',
          'refactor'
        ]
      },
      confidence: 'high'
    }

    {
      summary: '用户希望将App组件中用于获取资源图标的组件抽离为公共组件',
      motivation: '提高代码复用性，将特定功能从App组件中解耦，便于在其他地方使用',
      suspectedFiles: [],
      searchHypothesis: {
        fileNameHints: [ 'App', 'Icon', 'ResourceIcon', 'IconFetcher', 'IconComponent' ],
        dirNameHints: [ 'components', 'shared', 'common', 'ui', 'icons' ],
        entryHints: [ 'App', 'Layout', 'Main', 'Root' ],
        semanticHints: [
          'icon',
          'resource',
          'fetch',
          'component',
          'extract',
          'reusable',
          'shared'
        ]
      },
      confidence: 'medium'
    }
*/

/**
 这个节点只做一件事：
 - 把自然语言的输入，变更为 结构化的意图层 changeIntent
 其中：
 - suspectedFiles 仅仅是假设
 - 意图层也只是意图假设
 - 此时并没有去搜代码
 
 suspectedFiles 从哪里来的？
 - 用户显示提供的路径，比如 `ag ask "我想把 packages/cmdb-app/src/components 中的 403 组件抽离成一个通用 组件"` ，这里的路径就是用户提供的
 - Repo 的 “通用约定”「不需要 tool」
  - 比如： React 组件场景的 index.tsx 、Component.tsx
  - 比如：有些项目同时存在 js/ts混用
 
 scope 本身就是 “意图级别” 的概念
 
 一个非常重要的边界认知：
 - 如果 意图层 为了计算 suspectedFiles 就去扫描 repo ，那么它就越权了
 - 这只会导致你失去边界，graph 会再度坍缩成 ：LLM → tool → LLM → tool
 - 这是我刻意避免的
 
 需要做的是，可以对这个意图层打一个标签，比如：
 - confidence: 'low' | 'medium' | 'high'
 - 在 prompt 中明确：“如果文件或范围是基于推测，请将 confidence 标为 low。”
 - 此时 llm 会对这个意图层的输出打上标签
 
 真正的 scope 和 files 是 分析层 去做的
 */