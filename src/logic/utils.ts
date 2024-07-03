export const MAXIMUM_FRACTION_DIGITS = 2

export function formatMana(mana: string, maximumFractionDigits = MAXIMUM_FRACTION_DIGITS): string {
  return (Number(mana || '0') / 1e18).toFixed(maximumFractionDigits).toLocaleString()
}

export function chunks<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) {
    return []
  }

  return items.reduce(
    (acc: T[][], curr: T) => {
      if (acc[acc.length - 1].length === chunkSize) {
        acc.push([curr])
      } else {
        acc[acc.length - 1].push(curr)
      }
      return acc
    },
    [[]]
  )
}

export async function sleep(ms: number) {
  return new Promise<void>((ok) => setTimeout(ok, ms))
}
