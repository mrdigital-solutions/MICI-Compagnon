import { describe, expect, it, vi } from 'vitest'
import { SaveTimeoutError, describeSaveError, quickWrite, setDbHealth, withSaveTimeout } from './dbHealth'

describe('withSaveTimeout', () => {
  it('rejette si l\'écriture ne répond jamais (base bloquée)', async () => {
    vi.useFakeTimers()
    const p = withSaveTimeout(() => new Promise(() => {}), 1000)
    const assertion = expect(p).rejects.toBeInstanceOf(SaveTimeoutError)
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    vi.useRealTimers()
  })

  it('renvoie le résultat et propage les erreurs normales', async () => {
    await expect(withSaveTimeout(async () => 42)).resolves.toBe(42)
    await expect(withSaveTimeout(async () => { throw new Error('x') })).rejects.toThrow('x')
  })
})

describe('describeSaveError', () => {
  it('explique le blocage par une autre fenêtre', () => {
    expect(describeSaveError(new SaveTimeoutError())).toMatch(/Fermez complètement/)
    setDbHealth('blocked')
    expect(describeSaveError(new Error('x'))).toMatch(/Fermez complètement/)
    setDbHealth('ok')
    expect(describeSaveError(new Error('x'))).toMatch(/Réessayez/)
  })

  it('quickWrite renvoie false au lieu de lever', async () => {
    await expect(quickWrite(async () => { throw new Error('x') })).resolves.toBe(false)
  })
})
