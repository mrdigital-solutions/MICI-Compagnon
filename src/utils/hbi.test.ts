import { describe, expect, it } from 'vitest'
import { computeHbi, getHbiLevel } from './hbi'

const calm = {
  fatigue: 0,
  digestivePain: 0,
  jointPain: 0,
  stoolCount: 1,
  stoolConsistency: 'normale' as const,
}

describe('computeHbi', () => {
  it('donne 0 pour une journée sans symptôme', () => {
    expect(computeHbi(calm).score).toBe(0)
  })

  it('additionne état général, douleur, selles liquides et complications', () => {
    const r = computeHbi({
      fatigue: 3, // état général 2
      digestivePain: 4, // douleur 3
      jointPain: 2, // arthralgie +1
      stoolCount: 5,
      stoolConsistency: 'liquide', // +5
      crohnSigns: ['aphtes', 'fissure_anale'], // +2
    })
    expect(r).toEqual({ score: 13, wellbeing: 2, abdominalPain: 3, liquidStools: 5, complications: 3 })
  })

  it('ne compte pas les selles normales ou dures', () => {
    expect(computeHbi({ ...calm, stoolCount: 4, stoolConsistency: 'dure' }).liquidStools).toBe(0)
    expect(computeHbi({ ...calm, stoolCount: 3, stoolConsistency: 'molle' }).liquidStools).toBe(3)
  })

  it('ignore les doublons de signes', () => {
    expect(computeHbi({ ...calm, crohnSigns: ['abces', 'abces'] }).complications).toBe(1)
  })
})

describe('getHbiLevel', () => {
  it('suit les seuils habituels', () => {
    expect(getHbiLevel(4).level).toBe('remission')
    expect(getHbiLevel(5).level).toBe('legere')
    expect(getHbiLevel(7).level).toBe('legere')
    expect(getHbiLevel(8).level).toBe('moderee')
    expect(getHbiLevel(16).level).toBe('moderee')
    expect(getHbiLevel(17).level).toBe('severe')
  })
})
