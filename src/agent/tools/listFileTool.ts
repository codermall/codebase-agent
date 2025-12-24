import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export const LIST_FILE_SCHEMA = z.object({
  dir: z.string().describe("文件夹相对路径")
})

export const listFileTool = tool(
  async ({dir}) => {
    const absPath = path.resolve(process.cwd(), dir)
    const entries = await fs.readdir(absPath, {withFileTypes: true})
    console.error('查看文件执行工具：', dir)
    return entries.map(e => `${e.isDirectory() ? 'DIR' : 'FILE'} ${e.name}`).join('\n')
  },
  {
    description: '列出当前目录下的所有文件',
    name: 'listFile',
    schema: LIST_FILE_SCHEMA
  }
)