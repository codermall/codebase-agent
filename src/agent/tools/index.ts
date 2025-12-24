import {listFileTool, LIST_FILE_SCHEMA} from './listFileTool'
import {readFileTool, READ_FILE_SCHEMA} from './readFileTool'

export const toolsMap = {
  [listFileTool.name]: listFileTool,
  [readFileTool.name]: readFileTool,
}

export const TOOLS_SCHEMA = {
  [listFileTool.name]: LIST_FILE_SCHEMA,
  [readFileTool.name]: READ_FILE_SCHEMA,
}

export const tools = Object.values(toolsMap)