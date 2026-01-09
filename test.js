import {PromptTemplate} from '@langchain/core/prompts'
import {ChatOpenAI} from '@langchain/openai'
import {StringOutputParser} from '@langchain/core/output_parsers'

const userPrompt = PromptTemplate.fromTemplate('请解释这一句话: {question}')

const model = new ChatOpenAI({
  configuration: {
    baseURL: 'https://api.deepseek.com/v1',
  },
  model: 'deepseek-chat',
  apiKey: "sk-7a8f4dae5c6c41b799e63c37156d50ea",
  temperature: 0,
})

const parser = new StringOutputParser()
// 管道式执行，形成一个链条
const chain = userPrompt.pipe(model).pipe(parser)

const result = await chain.batch([
  {question: 'Python中的字典怎么理解？'}, 
  {question: 'JavaScript中的数组怎么理解？'}
])

result.forEach((r, idx) => {
  console.log(`第${idx + 1}条结果：`, r);
});