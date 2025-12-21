// 定义状态 state

import {z} from 'zod'
import type {BaseMessage} from '@langchain/core/messages'
import {MessagesZodMeta} from '@langchain/langgraph'
import {registry} from '@langchain/langgraph/zod'

export const CodebaseAgentState = z.object({
  messages: z.array(z.custom<BaseMessage>())
  .register(registry, MessagesZodMeta),
})

export type CodebaseAgentStateType = z.infer<typeof CodebaseAgentState>

export interface AgentState {
  messages: BaseMessage[]
}