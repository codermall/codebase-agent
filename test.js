// test-search.js
import { spawn } from 'child_process'
import path from 'path'

async function testDirectSpawn() {
  const patterns = ['403', 'Forbidden', 'Error403', 'AccessDenied', 'App', 'Layout', 'Router', 'ErrorBoundary', 'Page']
  
  console.log('Testing direct spawn...')
  console.log('Pattern:', patterns.join('|'))
  console.log('CWD:', process.cwd())
  
  const start = Date.now()
  
  const rg = spawn('rg', [
    patterns.join('|'),
    '.',  // 明确指定搜索路径为当前目录
    '--json',
    '--glob=!node_modules',
    '--glob=!.git',
    '--glob=!dist',
    '--glob=!build',
    '--glob=!coverage',
    '--ignore-file', '.gitignore', 
  ], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']  // 明确指定 stdin, stdout, stderr
  })
  
  let output = ''
  let errorOutput = ''
  
  // 监听 stdout
  rg.stdout.on('data', (data) => {
    const chunk = data.toString()
    output += chunk
    // 实时输出，避免缓冲区问题
    process.stdout.write(chunk)
  })
  
  // 监听 stderr（重要！避免缓冲区阻塞）
  rg.stderr.on('data', (data) => {
    const chunk = data.toString()
    errorOutput += chunk
    console.error('===== stderr =====', chunk)
  })
  
  rg.on('error', (err) => {
    console.log('===== spawn error =====', err)
  })
  
  rg.on('exit', (code, signal) => {
    console.log('===== exit =====', code, signal)
  })
  
  // 添加超时机制
  const timeout = setTimeout(() => {
    console.log('===== timeout, killing process =====')
    rg.kill('SIGTERM')
  }, 30000) // 30秒超时
  
  return new Promise((resolve) => {
    rg.on('close', (code, signal) => {
      clearTimeout(timeout)
      const duration = Date.now() - start
      console.log(`\nDirect spawn took ${duration}ms, exit code: ${code}, signal: ${signal}`)
      console.log(`Output lines: ${output.split('\n').length}`)
      if (errorOutput) {
        console.log(`Error output: ${errorOutput}`)
      }
      resolve({ duration, output, errorOutput })
    })
  })
}

testDirectSpawn().then(() => console.log('Test complete'))