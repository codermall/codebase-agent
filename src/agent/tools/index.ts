import {listFileTool} from './listFileTool'
import {readFileTool} from './readFileTool'

export const toolsMap = {
  [listFileTool.name]: listFileTool,
  [readFileTool.name]: readFileTool,
}

export const tools = Object.values(toolsMap)