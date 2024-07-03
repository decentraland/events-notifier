import { chunks, formatMana } from '../../src/logic/utils'

describe('utils unit tests', () => {
  test('formatMana should work', async () => {
    expect(formatMana('1000000000000000')).toBe('0.00')
    expect(formatMana('10000000000000000')).toBe('0.01')
    expect(formatMana('100000000000000000')).toBe('0.10')
    expect(formatMana('1000000000000000000')).toBe('1.00')
    expect(formatMana('3445600000000000000')).toBe('3.45')
    expect(formatMana('10000000000000000000')).toBe('10.00')

    // With 3 decimals
    expect(formatMana('1000000000000000', 3)).toBe('0.001')
    expect(formatMana('10000000000000000', 3)).toBe('0.010')
    expect(formatMana('100000000000000000', 3)).toBe('0.100')
    expect(formatMana('1000000000000000000', 3)).toBe('1.000')
    expect(formatMana('3445600000000000000', 3)).toBe('3.446')
    expect(formatMana('10000000000000000000', 3)).toBe('10.000')

    // Edge cases
    expect(formatMana('')).toBe('0.00')
    expect(formatMana(undefined, 3)).toBe('0.000')
  })

  describe('chunks', function () {
    const names: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

    it('returns an empty array for an empty request', async () => {
      expect(chunks([], 1)).toEqual([])
      expect(chunks([], 10)).toEqual([])
    })

    it('returns elements in chunks of the requested size', async () => {
      expect(chunks(names, 1)).toEqual([['a'], ['b'], ['c'], ['d'], ['e'], ['f'], ['g'], ['h'], ['i']])
      expect(chunks(names, 2)).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i']])
      expect(chunks(names, 3)).toEqual([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i']
      ])
      expect(chunks(names, 4)).toEqual([['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h'], ['i']])
      expect(chunks(names, 5)).toEqual([
        ['a', 'b', 'c', 'd', 'e'],
        ['f', 'g', 'h', 'i']
      ])
      expect(chunks(names, 6)).toEqual([
        ['a', 'b', 'c', 'd', 'e', 'f'],
        ['g', 'h', 'i']
      ])
      expect(chunks(names, 7)).toEqual([
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        ['h', 'i']
      ])
      expect(chunks(names, 8)).toEqual([['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], ['i']])
      expect(chunks(names, 9)).toEqual([['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']])
      expect(chunks(names, 10)).toEqual([['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']])
    })
  })
})
