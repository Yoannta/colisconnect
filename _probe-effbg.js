const path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));
(async () => {
  const ctx = await chromium.launchPersistentContext(path.join(process.cwd(), '.pw-profile'), { channel: 'chrome', headless: true, viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('cc-theme', 'light'); } catch (e) { } });
  await page.goto('http://127.0.0.1:8899/dashboard.html', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => { });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, absent: true };
      const cs = getComputedStyle(el);
      const stack = [];
      for (let n = el; n; n = n.parentElement) {
        const b = getComputedStyle(n).backgroundColor || '';
        const m = b.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const p = m[1].split(',').map(s => parseFloat(s));
        const a = p.length > 3 ? p[3] : 1;
        if (a <= 0) continue;
        stack.push({ r: p[0], g: p[1], b: p[2], a });
        if (a > 0.92) break;
      }
      let out = { r: 255, g: 255, b: 255 };
      for (let i = stack.length - 1; i >= 0; i--) {
        const c = stack[i];
        out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
      }
      const raw = [];
      for (let n2 = el; n2; n2 = n2.parentElement) { const bb = getComputedStyle(n2).backgroundColor || ''; raw.push(n2.tagName + '=' + bb); }
      return {
        raw, stacked: stack.map(c => c.r + '/' + c.g + '/' + c.b + '/' + c.a),
        sel, color: cs.color, own: cs.backgroundColor, eff: 'rgb(' + Math.round(out.r) + ',' + Math.round(out.g) + ',' + Math.round(out.b) + ')',
        stackLen: stack.length, hidden: cs.display === 'none' || cs.visibility === 'hidden',
        text: (el.textContent || '').trim().slice(0, 30)
      };
    };
    return [pick('p.brand-name'), pick('label[for="dash-demande-origin"]')];
  });
  console.log(JSON.stringify(r, null, 1));
  await ctx.close();
})();
