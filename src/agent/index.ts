import { StateGraph, END, START} from '@langchain/langgraph'
import {CodebaseAgentStateSchema} from './state'
import {shouldContinue} from './nodes/shouldContinue'
import {PlanNode, llmNode, toolNode, changeIntentNode, impactAnalysisNode, validationNode} from './nodes'



export function createCodebaseAgent() {
  const graph = new StateGraph(CodebaseAgentStateSchema)
    .addNode('changeIntentNode', changeIntentNode)
    .addNode('impactAnalysisNode', impactAnalysisNode)
    .addNode('validationNode', validationNode)
    // .addNode('llm', llmNode)
    .addNode('tool', toolNode)
    .addEdge(START, 'changeIntentNode')
    .addEdge('changeIntentNode', 'validationNode')
    .addEdge('validationNode', 'impactAnalysisNode')
    .addConditionalEdges('impactAnalysisNode', shouldContinue, ['tool', END])
    .addEdge('tool', 'impactAnalysisNode')
    // .addEdge('impactAnalysisNode', 'llm')
    // .addConditionalEdges('llm', shouldContinue, ['tool', END])
    // .addEdge('tool', 'llm')
  
  return graph.compile()
}

// ======== 至此， 我就拥有了一个 LangGraph Agent 了 ==========

/**
 * Agent 并不是 LLM
 * Prompt 是 Agent 的行为策略
 * Tool 是 Agent 的行为执行者
 */
