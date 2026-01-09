/**
  事实节点
  - level 1: 验证 suspectedFiles 是否存在
  - level 2: 文件名 / 符号 搜索 「rg -> glob 降级」
  - level 3: 语义兜底「限量」「只在前两个失败之后使用 - 非常危险，需要限量」
 */

import type {AgentState} from '../state'

import {spawn} from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'

import fg from 'fast-glob'
import {SystemMessage, HumanMessage} from '@langchain/core/messages'

import {model} from '../llm'


/**
 三层固定权重
  path_exists        weight = 0.5
  content_anchor     weight = 0.3
  semantic_confirm   weight = 0.2
 */

export type EvidenceType =
  | 'path_exists'        // 文件是否真实存在
  | 'content_anchor'     // 是否命中工程锚点（符号、字符串、export）
  | 'semantic_confirm'   // 语义/LLM 判断

interface EvidenceSignal {
  type: EvidenceType
  weight: number       // 该层证据在整体中的权重
  confidence: number   // 该证据自身可信度 0~1
  meta?: any
}


export async function validationNode(state: AgentState) {
  const { suspectedFiles, searchHypothesis, summary } = state.changeIntent || {}
  const {
    fileNameHints,
    entryHints,
    semanticHints
  } = searchHypothesis || {}

  // 证据 map
  const evidenceMap = new Map<string, EvidenceSignal[]>()

  const addSignal = (file: string, signal: EvidenceSignal) => {
    if (!evidenceMap.has(file)) {
      evidenceMap.set(file, [])
    }
    evidenceMap.get(file)!.push(signal)
  }

  /** ------- 第一层: Path Exists ------- */
  const existingFiles = await validateSuspectedFiles(
    suspectedFiles ?? []
  )
  for (const file of existingFiles) {
    addSignal(file, {
      type: 'path_exists',
      weight: 0.5,
      confidence: 1
    })
  }

  /** ------- 第二层: Content Anchor ------- */
  const nameHints = Array.from(new Set([...(fileNameHints ?? []), ...(entryHints ?? [])]))
  const anchorMatches = await searchContentAnchors(nameHints)
  for (const match of anchorMatches) {
    addSignal(match.file, {
      type: 'content_anchor',
      weight: 0.3,
      confidence: match.confidence,
      meta: { anchors: match.anchors }
    })
  }

  /** ------- 第三层: Semantic Confirm ------- */
  const candidateFiles = Array.from(evidenceMap.keys())
  const semanticMatches = await semanticConfirmFiles(
    semanticHints ?? [],
    candidateFiles,
    summary ?? '没有提供意图总结'
  )

  for (const match of semanticMatches) {
    addSignal(match.file, {
      type: 'semantic_confirm',
      weight: 0.2,
      confidence: match.confidence,
      meta: { reason: match.reason }
    })
  }

  /* ---------- Aggregate ---------- */
  // 计算证据强度
  const validatedFiles = Array.from(evidenceMap.entries()).map(
    ([file, signals]) => {
      // const score = Math.min(
      //   1,
      //   signals.reduce(
      //     (sum, s) => sum + s.weight * s.confidence,
      //     0
      //   )
      // )

      // const level =
      //   score >= 0.7 ? 'strong'
      //   : score >= 0.4 ? 'medium'
      //   : 'weak'

      const { level, score } = aggregateEvidence(signals)

      return {
        file,
        evidence: { score, level }
      }
    }
  )
  
  // 最终返回结果 - 携带证据信息的验证结果
  console.error('===== validationNode validatedFiles =====', validatedFiles)
  console.error('===== validationNode hasAnchor =====', validatedFiles.some(
    f => f.evidence.level === 'strong'
  ))
  return {
    validation: {
      validatedFiles,
      hasAnchor: validatedFiles.some(
        f => f.evidence.level === 'strong'
      )
    }
  }
  
}

function aggregateEvidence(signals: EvidenceSignal[]) {
  const hasPath = signals.some(s => s.type === 'path_exists')

  const contentSignals = signals.filter(
    s => s.type === 'content_anchor'
  )

  const semanticSignals = signals.filter(
    s => s.type === 'semantic_confirm'
  )

  // content anchor 的最强一个
  const bestContent = contentSignals.reduce(
    (max, s) => Math.max(max, s.confidence),
    0
  )

  // semantic 只能加分
  const semanticBoost = semanticSignals.reduce(
    (max, s) => Math.max(max, s.confidence),
    0
  )

  // ---------- 判级逻辑 ----------

  // strong：真实存在 + 明确锚点
  if (hasPath && bestContent >= 0.6) {
    return {
      level: 'strong',
      score: 0.8 + semanticBoost * 0.2
    }
  }

  // medium：任一强事实
  if (hasPath || bestContent >= 0.7) {
    return {
      level: 'medium',
      score: 0.5 + semanticBoost * 0.2
    }
  }

  // weak：只有弱语义
  if (semanticBoost >= 0.6) {
    return {
      level: 'weak',
      score: 0.3
    }
  }

  return {
    level: 'weak',
    score: 0.1
  }
}

let hasRg: boolean | null = null

// 检查 ripgrep 是否可用
async function hasRipgrep(): Promise<boolean> {
  if(hasRg !== null) return hasRg // 不用每次都验证 - 一次足矣
  return new Promise((resolve) => {
    const rg = spawn('rg', ['--version'])
    
    rg.on('error', () => {
      hasRg = false
      resolve(false)
    })
    
    rg.on('exit', (code) => {
      hasRg = code === 0
      resolve(hasRg)
    })
    
    // 设置超时，防止卡住
    setTimeout(() => {
      rg.kill()
      resolve(false)
    }, 3000)
  })
}

async function searchFilesWithRg(files: string[] | string) {
  // eg: [src/agent/nodes/changeIntentNode.ts] -> [changeIntentNode]
  const filesArray = (Array.isArray(files) ? files : [files]).map(p => path.basename(p, path.extname(p)))
  return new Promise((resolve, reject) => {
    const rg = spawn('rg', [
      filesArray.join('|'), 
      '.',
      '--json',
      // 排除常见的非源码目录
      '--glob=!node_modules',
      '--glob=!.git',
      '--glob=!dist',
      '--glob=!build',
      '--glob=!coverage',
      '--glob=!*.log',
      '--glob=!*.min.js',
      '--glob=!package-lock.json',
      '--glob=!yarn.lock',
      '--glob=!test',
      '--glob=!*.yaml'
    ], {
      cwd: process.cwd(),  // 指定工作目录
      stdio: 'pipe'
    })

    let output = ''
    let errorOutput = ''

    rg.on('error', (err) => {
      reject(err)
    })

    rg.on('close', (code, signal) => {
      // ripgrep 的退出码：
      // 0: 找到匹配
      // 1: 没找到匹配
      // 2: 错误
      if (code === 0 || code === 1) {
        // 正常退出（找到或没找到）
        resolve(output)
      } else {
        reject(new Error(`ripgrep search failed with code ${code}: ${errorOutput}`))
      }
    })

    // 收集所有输出
    rg.stdout.on('data', (data) => {
      output += data.toString()
    })

    // 设置超时，防止卡住
    // const timeout = setTimeout(() => {
    //   rg.kill()
    //   reject(new Error('ripgrep search timeout'))
    // }, 10000)
    // 清理超时
    // rg.on('close', () => {
    //   clearTimeout(timeout)
    // })
  })
}

/**
 * @zh 使用 ripgrep 搜索文件
 * 
 
  获取的 json 示例：
{"type":"begin","data":{"path":{"text":"src/agent/index.ts"}}}
{"type":"match","data":{"path":{"text":"src/agent/index.ts"},"lines":{"text":"import {PlanNode, llmNode, toolNode, changeIntentNode, impactAnalysisNode} from './nodes'\n"},"line_number":4,"absolute_offset":164,"submatches":[{"match":{"text":"changeIntentNode"},"start":37,"end":53}]}}
{"type":"match","data":{"path":{"text":"src/agent/index.ts"},"lines":{"text":"    .addNode('changeIntentNode', changeIntentNode)\n"},"line_number":10,"absolute_offset":354,"submatches":[{"match":{"text":"changeIntentNode"},"start":14,"end":30},{"match":{"text":"changeIntentNode"},"start":33,"end":49}]}}
 */
async function searchWithRg(anchors: string[]): Promise<ContentAnchorMatch[]> {
  const results = new Map<string, Set<string>>()
  try {
    // 从所有文件中匹配这个 锚点信息 「所有文件内容中匹配的」
    const output = await searchFilesWithRg(anchors) as string
    if(output) {
      output.split('\n').filter(Boolean).forEach(line => {
        if(line.trim() === '') return
        const json = JSON.parse(line)
        if(json.type === 'match') {
          // 当前匹配的文件
          const file = json.data.path.text
          // 当前文件模块的关系
          const currentModuleRelation = (results.get(file) ?? 
            (results.set(file, new Set()), results.get(file))) as Set<string>;
          // 处理 anchor
          json.data.submatches.forEach((submatch: any) => {
            const anchor = submatch.match?.text ?? ''
            if(anchor) {
              currentModuleRelation.add(anchor)
            }
          })
        }
      })
    }
  } catch(error) {
    // 忽略 - 没有找到就没有找到
  }

  return Array.from(results.entries()).map(
    ([file, anchors]) => ({
      file: path.normalize(file),
      anchors: Array.from(anchors),
      confidence: Math.min(1, anchors.size / 3)
    })
  )
}

async function searchWithGlob(
  anchors: string[]
): Promise<ContentAnchorMatch[]> {
  const results = new Map<string, Set<string>>()

  // 遍历每个 anchor - 「这里有个问题，这个 anchor 锚点 是直接匹配 文件 还是 对每一个文件内容进行匹配？」 「当前方法是仅匹配文件名」
  for (const p of anchors) {
    const matches = await fg(
      [
        `**/*${p}*.{ts,tsx,js,jsx,vue}`,
        `**/${p}.{ts,tsx,js,jsx,vue}`
      ],
      {
        ignore: ['**/node_modules/**', '**/dist/**']
      }
    )
    // 匹配成功, 添加到结果中
    if (matches.length > 0) {
      for (const file of matches) {
        const currentModuleRelation = (results.get(file) ?? 
          (results.set(file, new Set()), results.get(file))) as Set<string>;
        currentModuleRelation.add(p)
      }
    }
  }

  return Array.from(results.entries()).map(
    ([file, anchors]) => ({
      file: path.normalize(file),
      anchors: Array.from(anchors),
      confidence: Math.min(1, anchors.size / 3)
    })
  )
}

function buildSemanticPrompt(
  intent: string,
  file: string,
  snippet: string
) {
  return `
用户意图：
${intent}

文件路径：
${file}

文件内容片段：
${snippet}

问题：
这个文件是否与用户的改动意图直接相关？
请只回答：
- 相关
- 部分相关
- 不相关
`
}


interface SemanticMatch {
  file: string
  confidence: number   // LLM 语义相关度
  reason?: string
}

async function semanticConfirmFiles(
  semanticHints: string[],
  candidates: string[],
  intentSummary: string
): Promise<SemanticMatch[]> {
  // LLM 判断“这个文件是否与 intent 相关”
  const results: SemanticMatch[] = []

  for (const file of candidates.slice(0, 10)) {
    const content = await fs.readFile(file, 'utf-8')
    const snippet = content.slice(0, 800)

    const res = await model.invoke([
      new SystemMessage('你是一个代码语义分析助手'),
      new HumanMessage(buildSemanticPrompt(
        intentSummary,
        file,
        snippet
      ))
    ])

    const text = String(res.content)

    let confidence = 0
    if (text.includes('相关')) confidence = 0.7
    if (text.includes('部分')) confidence = 0.4
    if (text.includes('不相关')) confidence = 0.1

    results.push({
      file,
      confidence,
      reason: text
    })
  }

  return results

}

/**
 * @zh 验证 intent 中的 suspectedFiles 是否存在
 * 支持相对路径和绝对路径，返回规范化的绝对路径
 */
async function validateSuspectedFiles(files: string | string[]) {
  const filesArray = Array.isArray(files) ? files : [files]
  const confirmedFiles = new Set<string>()

  for(const file of filesArray) {
    try {
      // 将相对路径解析为绝对路径
      const absolutePath = path.resolve(process.cwd(), file)
      const normalizedPath = path.normalize(absolutePath)

      const stat = await fs.stat(normalizedPath)
      if(stat.isFile()) {
        confirmedFiles.add(file)
      }
    } catch(error) {
      // 忽略不存在的文件
    }
  }
  return Array.from(confirmedFiles)
}

export interface ContentAnchorMatch {
  file: string
  anchors: string[]
  confidence: number   // 0~1
}

// 搜索内容锚点信息
export async function searchContentAnchors(
  anchors: string[]
): Promise<ContentAnchorMatch[]> {
  if (anchors.length === 0) return []

  if(await hasRipgrep()) {
    return await searchWithRg(anchors)
  }
  return await searchWithGlob(anchors)
}

