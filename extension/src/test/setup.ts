/**
 * Test setup for FormPilot extension
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Chrome APIs
Object.assign(global, {
  chrome: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
    sidePanel: {
      open: vi.fn(),
      setPanelBehavior: vi.fn(),
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
  },
})