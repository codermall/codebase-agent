// 定义状态 state

import {z} from 'zod'
import type {BaseMessage} from '@langchain/core/messages'
import {MessagesZodMeta} from '@langchain/langgraph'
import {registry} from '@langchain/langgraph/zod'

// 对话级消息
const MessagesState = () =>
  z.array(z.custom<BaseMessage>())
   .register(registry, MessagesZodMeta) // 元信息是最重要的，langgraph 会阅读这个元信息，确认是否是消息对话，如果不是消息对话，就会覆盖之前的消息，你会丢失上下文

export const CodebaseAgentStateSchema = z.object({
  messages: MessagesState(),
  plan: z.array(z.string()).optional(),
  toolUsage: z.object({
    count: z.number().default(0), // 工具调用次数
  })
})

export type AgentState = z.infer<typeof CodebaseAgentStateSchema>
