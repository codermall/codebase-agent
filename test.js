import fg from 'fast-glob'

const matches = await fg(
  ['**/*changeIntentNode*.{ts,tsx,js,jsx,vue}', '**/changeIntentNode.{ts,tsx,js,jsx,vue}'],
  [
    `**/*changeIntentNode*.{ts,tsx,js,jsx,vue}`,
    `**/changeIntentNode.{ts,tsx,js,jsx,vue}`
  ],
  {
    ignore: ['**/node_modules/**', '**/dist/**']
  }
)

console.log('>>>>', matches)