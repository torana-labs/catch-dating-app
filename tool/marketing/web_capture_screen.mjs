// Draws one iPhone Safari screen around a rendered website page: the status
// bar above it and the bottom address bar over it, as Safari shows a page.
// The device bezel comes later from frame_device_capture.dart, so web and app
// captures share one frame.

/** iPhone 17 Pro screen in points, the size frame_device_capture.dart expects. */
export const safariScreen = Object.freeze({width: 402, height: 874, scale: 2, statusBar: 54, toolbar: 92});

/** The page area under the status bar; Safari's toolbar floats over its foot. */
export const safariViewport = Object.freeze({width: safariScreen.width, height: safariScreen.height - safariScreen.statusBar});

/**
 * HTML for the composed screen. `pagePng` is the page screenshot as base64,
 * `address` the host Safari shows (e.g. "catchdates.com") and `topColor` the
 * page's top pixel, which Safari extends behind the status bar.
 */
export function safariScreenHtml({pagePng, address, topColor}) {
  const [r, g, b] = topColor;
  const ink = (0.2126 * r + 0.7152 * g + 0.0722 * b) > 140 ? "#000" : "#fff";
  const {width, height, statusBar, toolbar} = safariScreen;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: rgb(${r} ${g} ${b}); }
body { position: relative; font-family: -apple-system, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.status { position: absolute; inset: 0 0 auto; height: ${statusBar}px; color: ${ink}; }
.time { position: absolute; left: 0; width: 138px; top: 19px; text-align: center; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
.icons { position: absolute; right: 0; width: 138px; top: 21px; display: flex; justify-content: center; gap: 6px; align-items: center; }
.page { position: absolute; top: ${statusBar}px; left: 0; width: ${width}px; height: ${height - statusBar}px; display: block; }
.toolbar { position: absolute; inset: auto 0 0; height: ${toolbar}px; background: rgb(250 250 250 / 0.94); box-shadow: 0 -0.5px 0 rgb(0 0 0 / 0.16); }
.bar { position: absolute; top: 9px; left: 14px; right: 14px; height: 48px; display: flex; gap: 10px; align-items: center; }
.round { flex: none; width: 48px; height: 48px; border-radius: 24px; background: rgb(255 255 255); box-shadow: 0 1px 4px rgb(0 0 0 / 0.12); display: grid; place-items: center; }
.address { flex: 1; height: 48px; border-radius: 24px; background: rgb(255 255 255); box-shadow: 0 1px 4px rgb(0 0 0 / 0.12); display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 16px; color: #000; }
.home { position: absolute; bottom: 8px; left: 50%; width: 140px; height: 5px; margin-left: -70px; border-radius: 3px; background: #000; }
</style></head><body>
<div class="status"><span class="time">9:41</span><span class="icons">
<svg width="18" height="12" viewBox="0 0 18 12" fill="${ink}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="${ink}"><path d="M8 2.6c2.4 0 4.5.9 6.1 2.4l1.2-1.3C13.4 1.9 10.8.8 8 .8S2.6 1.9.7 3.7L1.9 5C3.5 3.5 5.6 2.6 8 2.6zm0 3.5c1.4 0 2.6.5 3.6 1.4l1.2-1.3C11.5 5 9.8 4.3 8 4.3S4.5 5 3.2 6.2l1.2 1.3c1-.9 2.2-1.4 3.6-1.4zm0 3.5c.5 0 1 .2 1.3.5L8 11.5 6.7 10.1c.3-.3.8-.5 1.3-.5z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="${ink}" stroke-opacity="0.4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="${ink}"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="${ink}" fill-opacity="0.4"/></svg>
</span></div>
<img class="page" alt="" src="data:image/png;base64,${pagePng}">
<div class="toolbar"><div class="bar">
<span class="round"><svg width="11" height="18" viewBox="0 0 11 18"><path d="M9 2 2 9l7 7" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
<span class="address"><svg width="11" height="14" viewBox="0 0 11 14"><rect x="0.5" y="6" width="10" height="7.5" rx="1.6" fill="#000"/><path d="M2.6 6V4.2a2.9 2.9 0 0 1 5.8 0V6" fill="none" stroke="#000" stroke-width="1.5"/></svg>${escapeHtml(address)}</span>
<span class="round"><svg width="20" height="4" viewBox="0 0 20 4" fill="#000"><circle cx="2" cy="2" r="2"/><circle cx="10" cy="2" r="2"/><circle cx="18" cy="2" r="2"/></svg></span>
</div><div class="home"></div></div>
</body></html>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/gu, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"})[char]);
}
