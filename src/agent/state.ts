// 定义状态 state

import {z} from 'zod'
import type {BaseMessage} from '@langchain/core/messages'
import {MessagesZodMeta} from '@langchain/langgraph'
import {registry} from '@langchain/langgraph/zod'

// 对话级消息
const MessagesState = () =>
  z.array(z.custom<BaseMessage>())
   .register(registry, MessagesZodMeta); // 元信息是最重要的，langgraph 会阅读这个元信息，确认是否是消息对话，如果不是消息对话，就会覆盖之前的消息，你会丢失上下文


const searchHypothesis = z.object({
  fileNameHints: z.array(z.string()).describe("可能的文件/组件名"),
  dirNameHints: z.array(z.string()).describe("可能的目录/逻辑区域"),
  entryHints: z.array(z.string()).describe("可能的使用入口 (App / Layout 等)"),
  semanticHints: z.array(z.string()).describe("语义搜索线索"),
})

/*
  意图层 - 不要越权去“确认事实”
  - suspectedFiles
    👉 来自用户语言或直觉（如“在 xxx 目录下”）
  - searchHypothesis
    👉 来自 LLM 的工程化猜测，为 validation 服务
*/ 
const ChangeIntent = z.object({
  summary: z.string().describe("对话意图总结"),
  motivation: z.string().describe("当前对话的动机"),
  suspectedFiles: z.array(z.string()).describe("怀疑相关的文件路径列表"), // 一般来说，这里的值仅仅是针对这个工程的猜测，比如 React 应用的 tsx 等，或者又是来自于用户本身的特性
  searchHypothesis: searchHypothesis.describe("搜索假设层"),
  confidence: z.enum(['high', 'medium', 'low']).describe("信任度"), // 根据用户的输入，来判断这里的信任度，比如用户可能就没有给确定的路径，那这里的信任度就比较低
})


export type ChangeIntent = z.infer<typeof ChangeIntent>

const ImpactedFile = z.object({
  file: z.string().describe("文件路径"),
  reason: z.enum(['import', 'export', 'reexport', 'runtime']).describe("影响原因"),
  confidence: z.number().describe("信心度"),
})

export type ImpactedFile = z.infer<typeof ImpactedFile>

// 分析层
const ImpactAnalysis = z.object({
  confirmedFiles: z.array(z.string()).describe("确认相关的文件路径列表"), // 真正存在、且与变更直接相关的文件
  affectedModules: z.array(ImpactedFile).describe("从 import/使用关系 推倒出来的模块列表"), // 从 import/使用关系 推倒出来的模块
  blastRadius: z.enum(['small', 'medium', 'large']).describe("影响范围"),
  notes: z.string().describe("给上层 agent / UI 的解释"), // 给上层 agent / UI 的解释
})

export type ImpactAnalysis = z.infer<typeof ImpactAnalysis>


// 验证
const Validation = z.object({
  validatedFiles: z.array(z.object({
    file: z.string().describe("文件路径"),
    evidence: z.object({
      score: z.number().describe("证据得分 0~1"),
      level: z.enum(['strong', 'medium', 'weak']).describe("证据级别"),
    }).describe("证据"),
  })).describe("验证后的文件列表"),
  hasAnchor: z.boolean().describe("是否存在锚点"), // 是否存在锚点
})

export type Validation = z.infer<typeof Validation>

export const CodebaseAgentStateSchema = z.object({
  messages: MessagesState(),
  plan: z.array(z.string()).optional(),
  toolUsage: z.object({
    count: z.number().default(0), // 工具调用次数
    visitedPaths: z.set(z.string()).default(new Set()), // 访问过的路径
  }),
  changeIntent: ChangeIntent.optional(), // 意图层
  validation: Validation.optional(), // 验证
  impactAnalysis: ImpactAnalysis.optional(), // 分析层
})

export type AgentState = z.infer<typeof CodebaseAgentStateSchema>
