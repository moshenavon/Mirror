/** Same colours as `viewport.themeColor` in the root layout. */
const THEME_COLORS = [
  ["light", "#ffd02f"],
  ["dark", "#050038"],
] as const;

// On every client navigation to a page with its own metadata, Next/React
// re-render <head> and drop the theme-color <meta> tags. On a page's first
// (uncached) visit they come back only once its metadata has streamed in, so
// mobile Chrome briefly paints its default white/lavender toolbar. This keeps
// a theme-color tag in <head> at all times: a MutationObserver callback runs
// as a microtask, before the browser gets to paint the gap.
const script = `(function(){var h=document.head,c=${JSON.stringify(THEME_COLORS)};function f(){if(h.querySelector('meta[name="theme-color"]'))return;c.forEach(function(t){var m=document.createElement("meta");m.name="theme-color";m.media="(prefers-color-scheme: "+t[0]+")";m.content=t[1];h.appendChild(m)})}new MutationObserver(f).observe(h,{childList:true});f()})()`;

export function ThemeColorGuard() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
