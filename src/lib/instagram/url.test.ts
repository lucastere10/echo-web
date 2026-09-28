import { describe, expect, it } from 'vitest'

import { isValidInstagramMediaUrl, parseInstagramUrl } from '#/lib/instagram/url'

describe('parseInstagramUrl', () => {
  it('accepts reel, reels, p and tv links', () => {
    expect(parseInstagramUrl('https://www.instagram.com/reel/AbC123/')?.shortcode).toBe(
      'AbC123',
    )
    expect(parseInstagramUrl('https://instagram.com/reels/XyZ_99')?.kind).toBe('reels')
    expect(parseInstagramUrl('instagram.com/p/PostCode1/?igsh=abc')?.shortcode).toBe(
      'PostCode1',
    )
    expect(parseInstagramUrl('https://www.instagram.com/tv/TvCode/')?.kind).toBe('tv')
  })

  it('rejects non-instagram and unsupported paths', () => {
    expect(isValidInstagramMediaUrl('https://youtube.com/watch?v=1')).toBe(false)
    expect(isValidInstagramMediaUrl('https://www.instagram.com/username/')).toBe(false)
    expect(isValidInstagramMediaUrl('https://www.instagram.com/stories/user/123')).toBe(
      false,
    )
  })
})
