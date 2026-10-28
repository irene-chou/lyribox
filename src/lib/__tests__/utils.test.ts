import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    const hidden = Math.random() > 2 // always false, without a constant expression
    expect(cn('a', hidden && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('lets later Tailwind utilities override earlier conflicting ones', () => {
    expect(cn('p-2 text-sm', 'p-4')).toBe('text-sm p-4')
  })

  it('supports conditional objects', () => {
    expect(cn({ hidden: true, flex: false })).toBe('hidden')
  })
})
