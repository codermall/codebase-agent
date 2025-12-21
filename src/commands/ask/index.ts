import {HumanMessage} from '@langchain/core/messages'
import {Args, Command, Flags} from '@oclif/core'
import { createCodebaseAgent } from '../../agent/index.js'

export default class Ask extends Command {
  static description = 'Ask a question about the codebase'

  static args = {
    question: Args.string({description: 'The question to ask about the codebase', required: true}),
  }

  async run() {
    const {args} = await this.parse(Ask)
    const agent = createCodebaseAgent()
    const result = await agent.invoke({
      messages: [new HumanMessage(args.question)]
    }, {
      recursionLimit: 50
    })

    const final = [...result.messages]
      .reverse()
      .find(
        m =>
          typeof m.content === 'string' &&
          m.content.trim().startsWith('FINAL:')
      )

    if (final) {
      this.log(
        // String(final.content).replace(/^FINAL:\s*/, '')
      )
    } else {
      this.log('未生成最终答案')
    }
  }
}