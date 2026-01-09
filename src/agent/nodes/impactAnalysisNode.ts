import type {AgentState, ImpactAnalysis, ImpactedFile} from '../state'
import {spawn} from 'node:child_process'
import path from 'node:path'

/**
 * 影响分析节点
 * 
 * 核心功能：
 * 1. 从 validation 中筛选 strong/medium 级别的文件作为 confirmedFiles（直接改哪些文件）
 * 2. 使用 ripgrep 分析这些文件的依赖关系，找出可能影响哪些文件
 * 3. 根据文件总数评估影响范围（small/medium/large）
 */
export async function impactAnalysisNode(state: AgentState): Promise<Partial<AgentState>> {
  const {validation} = state
  
  if (!validation || !validation.validatedFiles || validation.validatedFiles.length === 0) {
    return {
      impactAnalysis: {
        confirmedFiles: [],
        affectedModules: [],
        blastRadius: 'small',
        notes: '未找到已验证的文件，无法进行影响分析'
      }
    }
  }

  // 1. 筛选 strong/medium 级别的文件作为 confirmedFiles
  const confirmedFiles = validation.validatedFiles
    .filter(f => f.evidence.level === 'strong' || f.evidence.level === 'medium')
    .map(f => f.file)

  if (confirmedFiles.length === 0) {
    return {
      impactAnalysis: {
        confirmedFiles: [],
        affectedModules: [],
        blastRadius: 'small',
        notes: '未找到 strong 或 medium 级别的已验证文件'
      }
    }
  }

  // 2. 分析每个 confirmedFile 的影响关系
  const affectedModulesMap = new Map<string, ImpactedFile>()
  
  for (const confirmedFile of confirmedFiles) {
    const impacts = await analyzeFileImpacts(confirmedFile)
    for (const impact of impacts) {
      // 如果文件已经在 map 中，更新 confidence（取较大值）和 reason
      const existing = affectedModulesMap.get(impact.file)
      if (existing) {
        // 如果 reason 不同，保留更重要的 reason（import > export > reexport > runtime）
        const reasonPriority: Record<'import' | 'export' | 'reexport' | 'runtime', number> = {
          import: 4,
          export: 3,
          reexport: 2,
          runtime: 1
        }
        if (reasonPriority[impact.reason] > reasonPriority[existing.reason]) {
          existing.reason = impact.reason
        }
        existing.confidence = Math.max(existing.confidence, impact.confidence)
      } else {
        affectedModulesMap.set(impact.file, impact)
      }
    }
  }

  // 排除 confirmedFiles 本身（它们已经在 confirmedFiles 中了）
  for (const file of confirmedFiles) {
    affectedModulesMap.delete(file)
  }

  const affectedModules = Array.from(affectedModulesMap.values())

  // 3. 计算影响范围
  const totalFiles = confirmedFiles.length + affectedModules.length
  const blastRadius: 'small' | 'medium' | 'large' = 
    totalFiles < 3 ? 'small' :
    totalFiles < 10 ? 'medium' :
    'large'

  // 4. 生成 notes
  const notes = generateNotes(confirmedFiles, affectedModules, blastRadius)

  const impactAnalysis: ImpactAnalysis = {
    confirmedFiles,
    affectedModules,
    blastRadius,
    notes
  }

  console.error('===== impactAnalysisNode output =====', impactAnalysis)

  return {
    impactAnalysis
  }
}

/**
 * 分析单个文件的影响关系
 * 使用 ripgrep 搜索该文件的 import/export/reexport/runtime 关系
 */
async function analyzeFileImpacts(filePath: string): Promise<ImpactedFile[]> {
  const impacts: ImpactedFile[] = []
  
  // 获取文件名（不含扩展名）和路径信息，用于搜索
  const fileName = path.basename(filePath, path.extname(filePath))
  const relativePath = path.relative(process.cwd(), filePath)
  const normalizedPath = relativePath.replace(/\\/g, '/')
  const pathWithoutExt = normalizedPath.replace(/\.(ts|tsx|js|jsx|mts|mjs)$/, '')
  
  // 转义特殊字符用于正则表达式
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  // 构建搜索模式：文件名、相对路径等（转义特殊字符）
  const searchPatterns = [
    escapeRegex(fileName),
    escapeRegex(normalizedPath),
    escapeRegex(pathWithoutExt)
  ].filter(Boolean)

  if (searchPatterns.length === 0) {
    return impacts
  }

  try {
    // 使用 ripgrep 搜索并分析匹配行的上下文来确定关系类型
    const analyzedImpacts = await analyzeFileRelationsWithRipgrep(
      filePath,
      fileName,
      normalizedPath,
      pathWithoutExt
    )
    
    for (const impact of analyzedImpacts) {
      impacts.push(impact)
    }

    // 搜索该文件导出的符号被哪些文件使用
    const exportedSymbols = await extractExportedSymbols(filePath)
    if (exportedSymbols.length > 0) {
      const symbolMatches = await searchExportedSymbols(exportedSymbols, filePath)
      for (const match of symbolMatches) {
        if (match.file !== filePath) {
          // 检查是否已经存在，如果存在且是 runtime，则升级为 export
          const existing = impacts.find(i => i.file === match.file)
          if (!existing) {
            impacts.push({
              file: match.file,
              reason: 'export',
              confidence: match.confidence
            })
          } else if (existing.reason === 'runtime') {
            existing.reason = 'export'
            existing.confidence = Math.max(existing.confidence, match.confidence)
          }
        }
      }
    }

  } catch (error) {
    console.error(`分析文件 ${filePath} 的影响关系时出错:`, error)
  }

  return impacts
}

/**
 * 使用 ripgrep 分析文件关系
 * 通过搜索匹配行并分析上下文来确定 import/export/reexport 关系
 */
async function analyzeFileRelationsWithRipgrep(
  targetFile: string,
  fileName: string,
  normalizedPath: string,
  pathWithoutExt: string
): Promise<ImpactedFile[]> {
  const impacts: ImpactedFile[] = []
  const impactMap = new Map<string, {reason: 'import' | 'export' | 'reexport' | 'runtime', confidence: number}>()
  
  // 构建搜索模式：搜索文件名
  const searchPattern = fileName
  
  return new Promise((resolve) => {
    const rg = spawn('rg', [
      searchPattern,
      '.',
      '--json',
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
      cwd: process.cwd(),
      stdio: 'pipe'
    })

    const fileMatches = new Map<string, Array<{line: string, lineNumber: number}>>()
    let output = ''

    rg.stdout.on('data', (data) => {
      output += data.toString()
    })

    rg.on('close', (code) => {
      if (code === 0 || code === 1) {
        try {
          const lines = output.split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              if (json.type === 'match') {
                const file = path.normalize(json.data.path.text)
                if (file === path.normalize(targetFile)) {
                  continue // 跳过目标文件本身
                }
                
                const matchLine = json.data.lines?.text || ''
                const lineNumber = json.data.line_number || 0
                
                if (!fileMatches.has(file)) {
                  fileMatches.set(file, [])
                }
                fileMatches.get(file)!.push({line: matchLine, lineNumber})
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        } catch (e) {
          // 忽略错误
        }
        
        // 分析每个文件的匹配行，确定关系类型
        for (const [file, matches] of fileMatches.entries()) {
          let reason: 'import' | 'export' | 'reexport' | 'runtime' = 'runtime'
          let confidence = 0.5
          
          for (const match of matches) {
            const line = match.line.trim()
            
            // 检查 import 关系
            if (line.includes('import') && line.includes('from')) {
              // 检查是否引用了目标文件路径
              if (line.includes(normalizedPath) || 
                  line.includes(pathWithoutExt) ||
                  line.includes(fileName)) {
                reason = 'import'
                confidence = 0.8
                break
              }
            }
            
            // 检查 export ... from 关系（reexport）
            if (line.includes('export') && line.includes('from')) {
              if (line.includes(normalizedPath) || 
                  line.includes(pathWithoutExt) ||
                  line.includes(fileName)) {
                reason = 'reexport'
                confidence = 0.7
                break
              }
            }
          }
          
          // 如果找到了明确的关系，添加到结果中
          if (reason !== 'runtime' || matches.length > 0) {
            const existing = impactMap.get(file)
            if (!existing) {
              impactMap.set(file, {reason, confidence})
            } else {
              // 如果已有更重要的关系，保留更重要的
              const reasonPriority: Record<'import' | 'export' | 'reexport' | 'runtime', number> = {
                import: 4,
                export: 3,
                reexport: 2,
                runtime: 1
              }
              if (reasonPriority[reason] > reasonPriority[existing.reason]) {
                existing.reason = reason
                existing.confidence = confidence
              }
            }
          }
        }
        
        // 转换为 ImpactedFile 数组
        for (const [file, info] of impactMap.entries()) {
          impacts.push({
            file,
            reason: info.reason,
            confidence: info.confidence
          })
        }
      }
      
      resolve(impacts)
    })

    rg.on('error', () => {
      resolve(impacts)
    })
  })
}

/**
 * 使用 ripgrep 搜索匹配模式的文件
 */
async function searchWithRipgrep(
  pattern: string,
  excludeFile?: string
): Promise<Array<{file: string, confidence: number}>> {
  return new Promise((resolve, reject) => {
    const rg = spawn('rg', [
      pattern,
      '.',
      '--json',
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
      cwd: process.cwd(),
      stdio: 'pipe'
    })

    const results = new Map<string, number>()
    let output = ''

    rg.stdout.on('data', (data) => {
      output += data.toString()
    })

    rg.on('close', (code) => {
      if (code === 0 || code === 1) {
        try {
          const lines = output.split('\n').filter(Boolean)
          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              if (json.type === 'match') {
                const file = path.normalize(json.data.path.text)
                if (excludeFile && file === path.normalize(excludeFile)) {
                  continue
                }
                const count = results.get(file) || 0
                results.set(file, count + 1)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        } catch (e) {
          // 忽略错误
        }
        
        // 根据匹配次数计算 confidence
        const matches = Array.from(results.entries()).map(([file, count]) => ({
          file,
          confidence: Math.min(1, count / 3) // 匹配次数越多，confidence 越高
        }))
        
        resolve(matches)
      } else {
        resolve([])
      }
    })

    rg.on('error', () => {
      resolve([])
    })
  })
}

/**
 * 提取文件中导出的符号
 */
async function extractExportedSymbols(filePath: string): Promise<string[]> {
  const fs = await import('node:fs/promises')
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const symbols: string[] = []
    
    // 匹配 export 语句
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
    let match
    while ((match = exportRegex.exec(content)) !== null) {
      symbols.push(match[1])
    }
    
    // 匹配 export { ... } 形式
    const exportBracesRegex = /export\s*\{[^}]*\}/g
    while ((match = exportBracesRegex.exec(content)) !== null) {
      const bracesContent = match[0]
      const nameMatches = bracesContent.match(/(\w+)(?:\s+as\s+\w+)?/g)
      if (nameMatches) {
        symbols.push(...nameMatches.map(m => m.split(/\s+/)[0]))
      }
    }
    
    return Array.from(new Set(symbols))
  } catch (error) {
    return []
  }
}

/**
 * 搜索导出的符号在哪些文件中被使用
 */
async function searchExportedSymbols(
  symbols: string[],
  excludeFile?: string
): Promise<Array<{file: string, confidence: number}>> {
  if (symbols.length === 0) {
    return []
  }
  
  // 构建搜索模式：搜索 import { symbol } 或 symbol 的使用
  const pattern = `(?:import.*\{[^}]*(${symbols.join('|')})[^}]*\}|\\b(${symbols.join('|')})\\b)`
  
  return searchWithRipgrep(pattern, excludeFile)
}

/**
 * 生成影响分析的说明文本
 */
function generateNotes(
  confirmedFiles: string[],
  affectedModules: ImpactedFile[],
  blastRadius: 'small' | 'medium' | 'large'
): string {
  const totalFiles = confirmedFiles.length + affectedModules.length
  
  const notes = [
    `影响分析完成：`,
    `- 直接修改文件数：${confirmedFiles.length}`,
    `- 可能受影响文件数：${affectedModules.length}`,
    `- 总影响文件数：${totalFiles}`,
    `- 影响范围：${blastRadius}`,
    ``,
    `直接修改的文件：`,
    ...confirmedFiles.map(f => `  - ${f}`),
    ``,
    `可能受影响的文件（按影响类型分类）：`
  ]

  // 按 reason 分组
  const byReason = {
    import: affectedModules.filter(m => m.reason === 'import'),
    export: affectedModules.filter(m => m.reason === 'export'),
    reexport: affectedModules.filter(m => m.reason === 'reexport'),
    runtime: affectedModules.filter(m => m.reason === 'runtime')
  }

  if (byReason.import.length > 0) {
    notes.push(`  import 关系（${byReason.import.length} 个文件）：`)
    byReason.import.slice(0, 5).forEach(m => {
      notes.push(`    - ${m.file} (confidence: ${m.confidence.toFixed(2)})`)
    })
    if (byReason.import.length > 5) {
      notes.push(`    ... 还有 ${byReason.import.length - 5} 个文件`)
    }
  }

  if (byReason.export.length > 0) {
    notes.push(`  export 关系（${byReason.export.length} 个文件）：`)
    byReason.export.slice(0, 5).forEach(m => {
      notes.push(`    - ${m.file} (confidence: ${m.confidence.toFixed(2)})`)
    })
    if (byReason.export.length > 5) {
      notes.push(`    ... 还有 ${byReason.export.length - 5} 个文件`)
    }
  }

  if (byReason.reexport.length > 0) {
    notes.push(`  reexport 关系（${byReason.reexport.length} 个文件）：`)
    byReason.reexport.slice(0, 5).forEach(m => {
      notes.push(`    - ${m.file} (confidence: ${m.confidence.toFixed(2)})`)
    })
    if (byReason.reexport.length > 5) {
      notes.push(`    ... 还有 ${byReason.reexport.length - 5} 个文件`)
    }
  }

  if (byReason.runtime.length > 0) {
    notes.push(`  runtime 关系（${byReason.runtime.length} 个文件）：`)
    byReason.runtime.slice(0, 5).forEach(m => {
      notes.push(`    - ${m.file} (confidence: ${m.confidence.toFixed(2)})`)
    })
    if (byReason.runtime.length > 5) {
      notes.push(`    ... 还有 ${byReason.runtime.length - 5} 个文件`)
    }
  }

  return notes.join('\n')
}