import {ChatOpenAI} from '@langchain/openai'

// langchain 并不关心模型是谁，他只关心是否兼容某种，比如 OpenAI-compatible ，
export const model = new ChatOpenAI({
  configuration: {
    baseURL: 'https://api.deepseek.com/v1',
  },
  model: 'deepseek-chat', // 只要是 OpenAI-compatible 的模型，都可以使用
  apiKey: "sk-7a8f4dae5c6c41b799e63c37156d50ea",
  temperature: 0,
})