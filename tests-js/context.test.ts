import { beforeEach, describe, expect, it } from 'vitest'
import { collectDiagnosticContext } from '../resources/js/context'

describe('context collection', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('collects sanitized page and browser context', async () => {
    const ctx = await collectDiagnosticContext()

    expect(ctx.page).toBeDefined()
    expect(ctx.viewport).toBeDefined()
    expect(ctx.browser).toBeDefined()
  })

  it('only collects explicitly allowlisted localStorage and sessionStorage keys', async () => {
    localStorage.setItem('safe-flag', 'enabled')
    localStorage.setItem('auth_token', 'super-secret-token')
    sessionStorage.setItem('temp-flag', 'active')
    sessionStorage.setItem('secret_state', 'secret')

    const ctx = await collectDiagnosticContext({
      storage: {
        localStorageKeys: ['safe-flag'],
        sessionStorageKeys: ['temp-flag'],
      },
    })

    expect(ctx.storage).toBeDefined()
    const storageObj = ctx.storage as {
      local_storage?: Record<string, string>
      session_storage?: Record<string, string>
    }

    expect(storageObj.local_storage?.['safe-flag']).toBe('enabled')
    expect(storageObj.local_storage?.auth_token).toBeUndefined()

    expect(storageObj.session_storage?.['temp-flag']).toBe('active')
    expect(storageObj.session_storage?.secret_state).toBeUndefined()
  })

  it('does not collect storage at all if storage option is not configured', async () => {
    localStorage.setItem('key1', 'val1')
    const ctx = await collectDiagnosticContext()
    expect(ctx.storage).toBeUndefined()
  })
})

describe('context storage bounds', () => {
  it('truncates long allowlisted storage values', async () => {
    localStorage.setItem('big', 'z'.repeat(5000))

    const ctx = await collectDiagnosticContext({ storage: { localStorageKeys: ['big'] } })
    const value = (ctx.storage as { local_storage: Record<string, string> }).local_storage.big

    expect(value?.length).toBeLessThanOrEqual(1024 + '...[TRUNCATED]'.length)
    localStorage.clear()
  })
})
