import path from 'node:path'

const PROJECT_ROOT = process.cwd()

export function resolveSafePath(inputPath: string) {
  const resolved = path.resolve(PROJECT_ROOT, inputPath)

  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error('Access outside project root is not allowed.')
  }

  return resolved
}