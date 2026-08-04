/**
 * Keeps `<meta name="theme-color">` — the colour mobile browsers paint their
 * top bar with — in sync with the app's own top edge.
 *
 * The value itself is the tier-2 `--theme-color` token, re-pointed per theme
 * (`.dark`) and per accent (`[data-accent]`) in index.css, so this module never
 * names a colour: it reads whatever the cascade currently resolves the token
 * to. Both the theme and the accent provider call it right after they mutate
 * `<html>`, and reading a computed style flushes the pending style recalc, so
 * the value is always the post-change one.
 */
const META_SELECTOR = 'meta[name="theme-color"]'

export function syncThemeColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim()
  if (!color) return

  let meta = document.head.querySelector<HTMLMetaElement>(META_SELECTOR)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}
