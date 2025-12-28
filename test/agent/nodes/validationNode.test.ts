import {expect} from 'chai'
import {EventEmitter} from 'node:events'
import esmock from 'esmock'
import type {AgentState} from '../../../src/agent/state.js'

describe('validationNode', () => {
  describe('validationNode function', () => {
    it('测试1', async () => {
      const {validationNode} = await esmock('../../../src/agent/nodes/validationNode.js')

      const state: Partial<AgentState> = {
        changeIntent: {
          summary: '用户希望将位于 packages/cmdb-app/src/components 目录下的 403 组件进行抽离。',
          motivation: '用户意图重构代码，将特定的 403 错误页面组件从其当前位置独立出来，可能是为了提升组件的可复用性、便于维护或遵循新的架构规范。',
          suspectedFiles: [
            'src/agent/nodes/changeIntentNode.ts',
            'changeIntentNode.ts',
            // 'src/agent/nodes/changeIntentNode.tsx',
            // 'src/agent/nodes/changeIntentNode.js',
            // 'src/agent/nodes/changeIntentNode.jsx',
          ],
          searchHypothesis: {
            fileNameHints: [ '403', 'Forbidden', 'Error403', 'AccessDenied' ],
            dirNameHints: [ 'components', 'pages', 'views', 'errors', 'common', 'shared' ],
            entryHints: [ 'App', 'Layout', 'Router', 'ErrorBoundary', 'Page' ],
            semanticHints: [
              'error page',
              'forbidden',
              'access denied',
              'http status',
              'component extraction',
              'refactor'
            ]
          },
          confidence: 'high'
        }
      }

      const state2: Partial<AgentState> = {
        changeIntent: {
          summary: '用户希望将App组件中用于获取资源图标的组件抽离为公共组件',
          motivation: '提高代码复用性，将特定功能从App组件中解耦，便于在其他地方使用',
          suspectedFiles: [],
          searchHypothesis: {
            fileNameHints: [ 'App', 'Icon', 'ResourceIcon', 'IconFetcher', 'IconComponent' ],
            dirNameHints: [ 'components', 'shared', 'common', 'ui', 'icons' ],
            entryHints: [ 'App', 'Layout', 'Main', 'Root' ],
            semanticHints: [
              'icon',
              'resource',
              'fetch',
              'component',
              'extract',
              'reusable',
              'shared'
            ]
          },
          confidence: 'medium'
        }
      }

      const result = await validationNode(state)
      expect(result).to.deep.equal({})
    })
  })
})
