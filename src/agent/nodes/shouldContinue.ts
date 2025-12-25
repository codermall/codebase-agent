import {END} from '@langchain/langgraph'
import {AIMessage} from '@langchain/core/messages'


// 继续执行的判断逻辑 - 接受的上一个节点的输出，而上一个节点是 llmNode，输出是 {messages: []}
export function shouldContinue(state: any) {
  const last = state.messages.at(-1)
  if(!last) return END

  if(AIMessage.isInstance(last)) {
    if(
      typeof last.content === 'string' && 
      last.content.trim().startsWith('FINAL:')
    ) {
      return END
    }

    if(last.tool_calls?.length) {
      return 'tool'
    }
  }

  return END
}