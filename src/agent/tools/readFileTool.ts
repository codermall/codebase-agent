import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from 'node:fs/promises'
import path from 'node:path'

// 阅读文件的工具
export const readFileTool = tool(
  async ({filePath}) => {
    console.error('阅读文件执行工具：', filePath)
    const absPath = path.resolve(process.cwd(), filePath)
    const content = await fs.readFile(absPath, 'utf-8')
    return content
  },
  {
    description: '通过文件相对路径阅读本地源代码文件',
    name: 'readFile',
    schema: z.object({
      filePath: z.string().describe("文件相对路径"),
    }),
  }
)

/**
 * 工具并不会告诉 Agent “什么时候用它”
 * 只是描述了：
 * - ‘能力’
 * - ‘约束’
 * - ‘输入结构’
 * 
 * 是否调用工具，由 Agent 自己决定
 */

