import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Output directories
const chromeStoreDir = path.join(rootDir, 'chrome-store-assets', 'screenshots');
const chromePromoDir = path.join(rootDir, 'chrome-store-assets', 'promo');
const siteDir = path.join(rootDir, 'site-assets');

[chromeStoreDir, chromePromoDir, siteDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Read official app logo PNG (128x128) and convert to base64 data URI for 100% exact rendering
const iconPath = path.join(rootDir, 'public', 'icon', '128.png');
let logoDataUri = '';

if (fs.existsSync(iconPath)) {
  const base64 = fs.readFileSync(iconPath).toString('base64');
  logoDataUri = `data:image/png;base64,${base64}`;
} else {
  // Fallback SVG data URI if 128.png is missing
  logoDataUri = `data:image/svg+xml;utf8,<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="%233b82f6"/><stop offset="1" stop-color="%231d4ed8"/></linearGradient></defs><rect width="128" height="128" rx="28" ry="28" fill="url(%23bg)"/><g transform="translate(64,68) rotate(-45)"><rect x="-38" y="-8" width="52" height="16" fill="%23ffffff"/><path d="M14,-8 L14,8 L30,0 Z" fill="%23ffffff"/><path d="M22,-4 L22,4 L30,0 Z" fill="%231e3a8a"/></g><path d="M103,40 L94.83,42.83 L92,51 L89.17,42.83 L81,40 L89.17,37.17 L92,29 L94.83,37.17 Z" fill="%23ffffff"/></svg>`;
}

const APP_LOGO_IMG = (size = 32, extraStyle = '') => `
<img src="${logoDataUri}" width="${size}" height="${size}" style="border-radius: ${Math.round(size * 0.22)}px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45); object-fit: contain; flex-shrink: 0; ${extraStyle}" alt="Rewriter AI App Logo" />
`;

async function generateAllAssets() {
  console.log('🚀 Launching Puppeteer for store asset generation with official app logo & theme colors...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
  });

  // Exact theme variables matching assets/theme.css
  const baseCss = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

    :root {
      color-scheme: dark;
      --bg: #121118;
      --surface: #17151f;
      --surface-raised: #1d1b27;
      --border: #2b2937;
      --border-strong: #322f42;
      --fg: #f3f2fa;
      --fg-muted: #c7c3d9;
      --muted: #8f8aa3;
      --accent: #a78bfa;
      --accent-strong: #8b5cf6;
      --accent-blue: #3b82f6;
      --accent-emerald: #10b981;
      --glow: 0 0 20px rgba(167, 139, 250, 0.4);
      --sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: 1280px;
      height: 800px;
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.18), transparent 45%),
        radial-gradient(circle at 85% 20%, rgba(167, 139, 250, 0.22), transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(16, 185, 129, 0.12), transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 36px 36px, 36px 36px;
      font-family: var(--sans);
      color: var(--fg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 22px 36px 20px;
      gap: 16px;
      -webkit-font-smoothing: antialiased;
      position: relative;
    }

    .bg-sparkle {
      position: absolute;
      pointer-events: none;
      user-select: none;
    }
    .sp-1 { top: 25px; left: 480px; font-size: 22px; color: rgba(167, 139, 250, 0.6); filter: drop-shadow(0 0 10px rgba(167,139,250,0.8)); }
    .sp-2 { top: 35px; right: 480px; font-size: 20px; color: rgba(59, 130, 246, 0.6); filter: drop-shadow(0 0 10px rgba(59,130,246,0.8)); }
    .sp-3 { bottom: 30px; left: 50px; font-size: 24px; color: rgba(16, 185, 129, 0.6); filter: drop-shadow(0 0 12px rgba(16,185,129,0.8)); }

    .header-banner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-shrink: 0;
      z-index: 10;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f3f2fa;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(167, 139, 250, 0.3));
      border: 1px solid rgba(167, 139, 250, 0.5);
      box-shadow: 0 0 15px rgba(167, 139, 250, 0.25);
      padding: 4px 12px;
      border-radius: 100px;
      width: fit-content;
    }

    .header-title {
      font-size: 23px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.025em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-subtitle {
      font-size: 13px;
      color: var(--fg-muted);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .trust-pills {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .trust-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      backdrop-filter: blur(12px);
      padding: 7px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      color: var(--fg);
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }

    .trust-pill.blue {
      border-color: rgba(59, 130, 246, 0.45);
      color: #93c5fd;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), var(--surface));
    }

    .trust-pill.purple {
      border-color: rgba(167, 139, 250, 0.45);
      color: #ddd6fe;
      background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), var(--surface));
    }

    .trust-pill.emerald {
      border-color: rgba(16, 185, 129, 0.45);
      color: #6ee7b7;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), var(--surface));
    }

    .browser-frame {
      width: 100%;
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 16px;
      box-shadow: 
        0 25px 70px rgba(0, 0, 0, 0.85),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        0 0 35px rgba(167, 139, 250, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      z-index: 5;
    }

    .browser-bar {
      height: 42px;
      background: var(--surface-raised);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 14px;
      flex-shrink: 0;
    }

    .browser-dots {
      display: flex;
      gap: 8px;
    }

    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; border: 0.5px solid #e0443e; }
    .dot-yellow { background: #ffbd2e; border: 0.5px solid #dea123; }
    .dot-green { background: #27c93f; border: 0.5px solid #1aab29; }

    .browser-address {
      flex: 1;
      max-width: 520px;
      margin: 0 auto;
      height: 26px;
      background: rgba(18, 17, 24, 0.7);
      border: 1px solid var(--border);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      font-family: var(--mono);
      font-size: 11.5px;
      color: #93c5fd;
      gap: 8px;
    }

    .browser-content {
      flex: 1;
      position: relative;
      background: #121118;
      overflow: hidden;
    }

    .feature-annotation {
      position: absolute;
      z-index: 200;
      background: rgba(23, 21, 31, 0.96);
      border: 1.5px solid var(--accent);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 
        0 0 25px rgba(167, 139, 250, 0.35),
        0 15px 35px rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 380px;
    }

    .annotation-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(167, 139, 250, 0.35));
      border: 1px solid rgba(167, 139, 250, 0.6);
      color: #ddd6fe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      flex-shrink: 0;
    }

    .annotation-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .annotation-title {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .annotation-sub {
      font-size: 11.5px;
      color: var(--fg-muted);
      line-height: 1.4;
    }
  `;

  // ---------------------------------------------------------------------------
  // SCREENSHOT 1: Instant Inline Text Rewriter
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 1: 1-inline-rewrite-presets.png...');
  const htmlScreen1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .web-mail-app {
          padding: 26px 40px;
          height: 100%;
          background: radial-gradient(circle at 50% 0%, #1d1b27, #121118);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }

        .mail-card {
          background: rgba(23, 21, 31, 0.92);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
        }

        .mail-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
        }

        .mail-row { display: flex; gap: 12px; font-size: 13.5px; align-items: center; }
        .mail-label { color: var(--muted); width: 68px; font-weight: 600; }
        .mail-value { color: var(--fg); font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .avatar-chip {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #fff; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .editor-area {
          position: relative;
          min-height: 230px;
          font-size: 15px;
          line-height: 1.65;
          color: var(--fg-muted);
          padding: 20px;
          border-radius: 12px;
          background: rgba(18, 17, 24, 0.6);
          border: 1px solid var(--border);
        }

        .selected-text {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(167, 139, 250, 0.35));
          color: #ffffff;
          padding: 3px 6px;
          border-radius: 6px;
          box-shadow: 0 0 15px rgba(167, 139, 250, 0.5), 0 0 0 1px rgba(167, 139, 250, 0.6);
          font-weight: 600;
        }

        .rw-popover {
          position: absolute;
          top: 92px;
          left: 175px;
          width: 480px;
          background: rgba(23, 21, 31, 0.98);
          backdrop-filter: blur(24px);
          border: 1.5px solid var(--accent);
          border-radius: 16px;
          box-shadow: 
            0 25px 60px rgba(0,0,0,0.8),
            0 0 35px rgba(167, 139, 250, 0.35);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 100;
        }

        .popover-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          color: #ddd6fe;
          letter-spacing: 0.05em;
        }

        .popover-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .popover-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(167, 139, 250, 0.25));
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 100px;
          font-size: 11px;
          color: #ddd6fe;
          font-family: var(--mono);
          font-weight: 700;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .preset-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--fg);
        }

        .preset-chip.active {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(167, 139, 250, 0.35));
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 0 15px rgba(167, 139, 250, 0.4);
        }

        .custom-input-group {
          display: flex;
          gap: 8px;
        }

        .custom-input {
          flex: 1;
          background: rgba(18, 17, 24, 0.8);
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #ffffff;
          outline: none;
          font-family: var(--sans);
        }

        .btn-go {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #fff;
          font-weight: 700;
          border: none;
          padding: 0 18px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.5);
        }

        .shortcut-tip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--muted);
          padding-top: 6px;
          border-top: 1px solid var(--border);
        }

        kbd {
          font-family: var(--mono);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 10.5px;
          color: #ddd6fe;
        }
      </style>
    </head>
    <body>
      <div class="bg-sparkle sp-1">✦</div>
      <div class="bg-sparkle sp-2">✨</div>
      <div class="bg-sparkle sp-3">✦</div>

      <div class="header-banner">
        <div class="header-left">
          <div class="header-badge">✨ Instant AI Text Rewriter</div>
          <div class="header-title">
            ${APP_LOGO_IMG(28)}
            Rewriter AI — Polish & Rewrite Text Anywhere
          </div>
          <div class="header-subtitle">Highlight text in Gmail, LinkedIn, Slack, Twitter or Docs to change tone, fix grammar, or make concise</div>
        </div>
        <div class="trust-pills">
          <div class="trust-pill blue">🔒 100% Private & Direct</div>
          <div class="trust-pill purple">⚡ 1-Click Floating Widget</div>
          <div class="trust-pill emerald">🤖 Gemini, GPT-4o & Claude</div>
        </div>
      </div>

      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            🔒 mail.google.com/mail/u/0/#inbox?compose=new
          </div>
        </div>
        <div class="browser-content">
          <div class="web-mail-app">
            <div class="mail-card">
              <div class="mail-header">
                <div class="mail-row">
                  <span class="mail-label">To:</span>
                  <span class="mail-value"><div class="avatar-chip">J</div> Jordan Smith &lt;jordan.smith@acme.com&gt;</span>
                </div>
                <div class="mail-row">
                  <span class="mail-label">Subject:</span>
                  <span class="mail-value">Project Proposal Follow-up & Next Steps</span>
                </div>
              </div>
              <div class="editor-area">
                Hi Jordan,<br/><br/>
                <span class="selected-text">I am writing to check in regarding the updated project proposal we sent over last Thursday. Please let me know if you had a moment to look over it with your team, or if you have any questions or feedback. I am available for a brief call whenever convenient for you.</span>
              </div>
            </div>

            <!-- Inline Popover Widget -->
            <div class="rw-popover">
              <div class="popover-head">
                <div class="popover-title-group">
                  ${APP_LOGO_IMG(20)}
                  <span>REWRITER AI INLINE</span>
                </div>
                <span class="popover-badge">⚡ Gemini 1.5 Flash</span>
              </div>
              <div class="preset-grid">
                <div class="preset-chip active">⚡ Concise</div>
                <div class="preset-chip">💼 Executive</div>
                <div class="preset-chip">😊 Friendly</div>
                <div class="preset-chip">✨ Fix Grammar</div>
                <div class="preset-chip">🎯 Professional</div>
                <div class="preset-chip">🚀 Expand</div>
              </div>
              <div class="custom-input-group">
                <input class="custom-input" value="Make this email short, confident and professional" />
                <div class="btn-go">Rewrite ✦</div>
              </div>
              <div class="shortcut-tip">
                <span>Quick Trigger: <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd></span>
                <span style="color: #a78bfa; font-weight: 600;">Custom Tone Presets ⚙️</span>
              </div>
            </div>
          </div>

          <!-- Feature Callout Annotation -->
          <div class="feature-annotation" style="bottom: 24px; right: 28px;">
            <div class="annotation-icon">✨</div>
            <div class="annotation-text">
              <div class="annotation-title">Instant Floating Assistant</div>
              <div class="annotation-sub">Select text on any webpage to trigger tone presets or enter custom prompts</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen1, { waitUntil: 'domcontentloaded' });
  await delay(400);
  await page.screenshot({ path: path.join(chromeStoreDir, '1-instant-inline-rewriter.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 2: 1-Click Text Replacement & Live Preview
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 2: 2-inline-rewrite-result.png...');
  const htmlScreen2 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .web-mail-app {
          padding: 26px 40px;
          height: 100%;
          background: radial-gradient(circle at 50% 0%, #1d1b27, #121118);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }

        .mail-card {
          background: rgba(23, 21, 31, 0.92);
          border: 1px solid var(--border-strong);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
        }

        .mail-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
        }

        .mail-row { display: flex; gap: 12px; font-size: 13.5px; align-items: center; }
        .mail-label { color: var(--muted); width: 68px; font-weight: 600; }
        .mail-value { color: var(--fg); font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .avatar-chip {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #fff; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .editor-area {
          position: relative;
          min-height: 230px;
          font-size: 15px;
          line-height: 1.65;
          color: var(--fg-muted);
          padding: 20px;
          border-radius: 12px;
          background: rgba(18, 17, 24, 0.6);
          border: 1px solid var(--border);
        }

        .original-faded {
          opacity: 0.35;
          text-decoration: line-through;
          color: #f87171;
        }

        .rw-popover {
          position: absolute;
          top: 85px;
          left: 165px;
          width: 500px;
          background: rgba(23, 21, 31, 0.98);
          backdrop-filter: blur(24px);
          border: 1.5px solid var(--accent);
          border-radius: 18px;
          box-shadow: 
            0 25px 65px rgba(0,0,0,0.85),
            0 0 40px rgba(167, 139, 250, 0.4);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 100;
        }

        .result-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-title {
          font-size: 12px;
          font-weight: 800;
          color: #34d399;
          display: flex;
          align-items: center;
          gap: 7px;
          letter-spacing: 0.05em;
        }

        .model-tag {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 700;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(167, 139, 250, 0.25));
          color: #ddd6fe;
          border: 1px solid rgba(167, 139, 250, 0.4);
          padding: 3px 9px;
          border-radius: 100px;
        }

        .result-text-box {
          background: rgba(18, 17, 24, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 12px;
          padding: 16px;
          font-size: 14.5px;
          line-height: 1.6;
          color: #ffffff;
          border-left: 4px solid #10b981;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
        }

        .metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .action-row {
          display: flex;
          gap: 10px;
        }

        .btn-replace {
          flex: 1.4;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #fff;
          font-weight: 800;
          font-size: 13px;
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          box-shadow: 0 4px 18px rgba(139, 92, 246, 0.5);
        }

        .btn-secondary {
          flex: 1;
          background: var(--surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--fg);
          font-weight: 600;
          font-size: 12.5px;
          border-radius: 10px;
          padding: 11px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
      </style>
    </head>
    <body>
      <div class="bg-sparkle sp-1">✦</div>
      <div class="bg-sparkle sp-2">✨</div>

      <div class="header-banner">
        <div class="header-left">
          <div class="header-badge">⚡ Instant Text Replace</div>
          <div class="header-title">
            ${APP_LOGO_IMG(28)}
            1-Click Text Replacement & Live AI Preview
          </div>
          <div class="header-subtitle">Directly swap original draft with polished AI text, copy to clipboard, or generate alternatives</div>
        </div>
        <div class="trust-pills">
          <div class="trust-pill emerald">✓ 1-Click Replace</div>
          <div class="trust-pill purple">📋 Copy to Clipboard</div>
          <div class="trust-pill blue">🔄 Unlimited Refinements</div>
        </div>
      </div>

      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            🔒 mail.google.com/mail/u/0/#inbox?compose=new
          </div>
        </div>
        <div class="browser-content">
          <div class="web-mail-app">
            <div class="mail-card">
              <div class="mail-header">
                <div class="mail-row"><span class="mail-label">To:</span><span class="mail-value"><div class="avatar-chip">J</div> Jordan Smith &lt;jordan.smith@acme.com&gt;</span></div>
                <div class="mail-row"><span class="mail-label">Subject:</span><span class="mail-value">Project Proposal Follow-up & Next Steps</span></div>
              </div>
              <div class="editor-area">
                Hi Jordan,<br/><br/>
                <span class="original-faded">I am writing to check in regarding the updated project proposal we sent over last Thursday. Please let me know if you had a moment to look over it...</span>
              </div>
            </div>

            <!-- Result Popover Widget -->
            <div class="rw-popover">
              <div class="result-head">
                <div class="result-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  REWRITTEN RESULT (CONCISE & CONFIDENT)
                </div>
                <span class="model-tag">✦ Gemini 1.5 Flash</span>
              </div>
              <div class="result-text-box">
                <div class="metric-pill">✨ 52% shorter • High clarity</div><br/>
                Hi Jordan, following up on last week's proposal. Have you had a chance to review it with your team? Let me know if you have any questions or want to hop on a quick call.
              </div>
              <div class="action-row">
                <div class="btn-replace">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Replace Text
                </div>
                <div class="btn-secondary">📋 Copy</div>
                <div class="btn-secondary">🔄 Try Another</div>
              </div>
            </div>
          </div>

          <!-- Feature Callout Annotation -->
          <div class="feature-annotation" style="bottom: 24px; right: 28px;">
            <div class="annotation-icon">⚡</div>
            <div class="annotation-text">
              <div class="annotation-title">Direct Input Field Update</div>
              <div class="annotation-sub">Clicking "Replace Text" instantly updates your active text box without manual copy-paste</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen2, { waitUntil: 'domcontentloaded' });
  await delay(400);
  await page.screenshot({ path: path.join(chromeStoreDir, '2-one-click-text-replace.png') });
  await page.screenshot({ path: path.join(siteDir, 'screenshot-hero.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 3: Options Page - API Keys & Multi-LLM Support
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 3: 3-options-api-keys.png...');
  const htmlScreen3 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .options-container {
          max-width: 820px;
          margin: 0 auto;
          padding: 22px 32px 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .opt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .brand-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
        }

        .privacy-banner {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(167, 139, 250, 0.12));
          border: 1px solid rgba(167, 139, 250, 0.35);
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 13px;
          color: var(--fg-muted);
        }

        .section-card {
          background: rgba(23, 21, 31, 0.88);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sec-title {
          font-size: 14.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ddd6fe;
        }

        .provider-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .provider-card {
          background: rgba(18, 17, 24, 0.8);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .provider-card.active {
          border-color: rgba(16, 185, 129, 0.45);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(18, 17, 24, 0.85));
        }

        .provider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .provider-name {
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #ffffff;
        }

        .dot-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .input-row {
          display: flex;
          gap: 10px;
        }

        .key-input {
          flex: 1;
          background: rgba(12, 11, 18, 0.7);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: var(--mono);
          font-size: 12px;
          color: var(--fg);
        }

        .btn-validate {
          padding: 6px 14px;
          background: rgba(167, 139, 250, 0.2);
          border: 1px solid rgba(167, 139, 250, 0.4);
          color: #ddd6fe;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .model-select {
          background: rgba(12, 11, 18, 0.5);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="bg-sparkle sp-1">✦</div>
      <div class="bg-sparkle sp-2">✨</div>

      <div class="header-banner">
        <div class="header-left">
          <div class="header-badge">🔒 Privacy First & Bring Your Own Keys</div>
          <div class="header-title">
            ${APP_LOGO_IMG(28)}
            Connect Any AI Provider — Zero Middleman Tracking
          </div>
          <div class="header-subtitle">Direct client-to-API requests. Keys remain encrypted locally in Chrome storage</div>
        </div>
        <div class="trust-pills">
          <div class="trust-pill purple">🛡️ Zero Data Logging</div>
          <div class="trust-pill blue">🔐 Local Encryption</div>
          <div class="trust-pill emerald">💸 Pay-As-You-Go</div>
        </div>
      </div>

      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            🔒 chrome-extension://rewriter-ai/options.html
          </div>
        </div>
        <div class="browser-content">
          <div class="options-container">
            <div class="opt-header">
              <div class="brand-title">
                ${APP_LOGO_IMG(30)}
                Rewriter AI Settings
              </div>
            </div>

            <div class="privacy-banner">
              <span style="font-size: 22px;">🔒</span>
              <div>
                <strong style="color: #ffffff;">100% Privacy Guaranteed:</strong> Your API keys are saved strictly inside your local browser via <code style="color:#a78bfa;">chrome.storage.local</code>. No server middleman.
              </div>
            </div>

            <div class="section-card">
              <div class="sec-title">🔑 Configured Providers & Models</div>
              <div class="provider-grid">
                <!-- Gemini -->
                <div class="provider-card active">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status"></span> Google Gemini API</span>
                    <span style="font-size: 11.5px; color: #10b981; font-weight: 700;">✓ Active & Validated</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" value="AIzaSyA8x9K...m99021x" type="password" />
                    <div class="btn-validate">Test Connection</div>
                  </div>
                  <div class="model-select">
                    <span>Default Model: <strong>Gemini 1.5 Flash</strong> (Recommended, Ultra Fast)</span>
                    <span>▼</span>
                  </div>
                </div>

                <!-- OpenAI -->
                <div class="provider-card active">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status"></span> ChatGPT (OpenAI)</span>
                    <span style="font-size: 11.5px; color: #10b981; font-weight: 700;">✓ Active & Validated</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" value="sk-proj-992x18...mxx01" type="password" />
                    <div class="btn-validate">Test Connection</div>
                  </div>
                  <div class="model-select">
                    <span>Default Model: <strong>GPT-4o / GPT-4o-mini</strong></span>
                    <span>▼</span>
                  </div>
                </div>

                <!-- Anthropic -->
                <div class="provider-card">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status" style="background:#8c88ab; box-shadow:none;"></span> Anthropic Claude</span>
                    <span style="font-size: 11.5px; color: #a78bfa; font-weight: 600;">Get Key ↗</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" placeholder="sk-ant-api03-..." />
                    <div class="btn-validate">Save & Validate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Feature Callout Annotation -->
          <div class="feature-annotation" style="bottom: 22px; right: 28px;">
            <div class="annotation-icon">🔑</div>
            <div class="annotation-text">
              <div class="annotation-title">Direct Client Encryption</div>
              <div class="annotation-sub">Supports Gemini, OpenAI, Claude, Groq & local Ollama models with custom API keys</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen3, { waitUntil: 'domcontentloaded' });
  await delay(400);
  await page.screenshot({ path: path.join(chromeStoreDir, '3-multi-llm-models.png') });
  await page.screenshot({ path: path.join(siteDir, 'screenshot-options.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 4: Presets & Controls
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 4: 4-options-presets.png...');
  const htmlScreen4 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .options-container {
          max-width: 820px;
          margin: 0 auto;
          padding: 22px 32px 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .opt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .brand-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
        }

        .section-card {
          background: rgba(23, 21, 31, 0.88);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sec-title {
          font-size: 14.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ddd6fe;
        }

        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .preset-item {
          background: rgba(18, 17, 24, 0.8);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .preset-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .preset-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .preset-prompt {
          font-size: 12px;
          color: var(--muted);
        }

        .btn-action {
          padding: 5px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          color: var(--fg-muted);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .btn-add {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #fff;
          font-weight: 700;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 12.5px;
          align-self: flex-start;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .toggle-switch {
          width: 44px;
          height: 22px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 100px;
          position: relative;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div class="bg-sparkle sp-1">✦</div>
      <div class="bg-sparkle sp-2">✨</div>

      <div class="header-banner">
        <div class="header-left">
          <div class="header-badge">⚙️ Tailored Tone Presets</div>
          <div class="header-title">
            ${APP_LOGO_IMG(28)}
            Custom Tone Presets, Shortcuts & Control
          </div>
          <div class="header-subtitle">Build custom prompt templates to rewrite text for your specific workflow</div>
        </div>
        <div class="trust-pills">
          <div class="trust-pill purple">🎨 Unlimited Presets</div>
          <div class="trust-pill blue">⌨️ Custom Hotkeys</div>
          <div class="trust-pill emerald">🌐 Site Blacklists</div>
        </div>
      </div>

      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            🔒 chrome-extension://rewriter-ai/options.html#presets
          </div>
        </div>
        <div class="browser-content">
          <div class="options-container">
            <div class="opt-header">
              <div class="brand-title">
                ${APP_LOGO_IMG(30)}
                Presets & Floating Controls
              </div>
            </div>

            <div class="section-card">
              <div class="sec-title">✨ Quick Tone Presets</div>
              <div class="preset-list">
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">⚡ Concise & Direct</span>
                    <span class="preset-prompt">Rewrite to be brief, punchy and clear without losing key information.</span>
                  </div>
                  <div class="btn-action">Edit Preset</div>
                </div>
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">💼 Executive / Formal</span>
                    <span class="preset-prompt">Adopt a polished, executive tone suitable for clients or senior leadership.</span>
                  </div>
                  <div class="btn-action">Edit Preset</div>
                </div>
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">😊 Warm & Friendly</span>
                    <span class="preset-prompt">Use engaging, approachable language with positive phrasing.</span>
                  </div>
                  <div class="btn-action">Edit Preset</div>
                </div>
              </div>
              <div class="btn-add">+ Add Custom Tone Preset</div>
            </div>

            <div class="section-card">
              <div class="sec-title">⚙️ Floating Trigger & Shortcut Settings</div>
              <div class="toggle-row">
                <div>
                  <strong style="font-size: 13.5px; color:#ffffff;">Show floating AI button on text highlight</strong>
                  <div style="font-size: 12px; color: var(--muted);">Automatically displays floating trigger widget when selecting text</div>
                </div>
                <div class="toggle-switch"></div>
              </div>
            </div>
          </div>

          <!-- Feature Callout Annotation -->
          <div class="feature-annotation" style="bottom: 22px; right: 28px;">
            <div class="annotation-icon">🎨</div>
            <div class="annotation-text">
              <div class="annotation-title">Fully Customizable</div>
              <div class="annotation-sub">Create prompt templates tailored for emails, coding docs, or social posts</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen4, { waitUntil: 'domcontentloaded' });
  await delay(400);
  await page.screenshot({ path: path.join(chromeStoreDir, '4-privacy-byok-security.png') });
  await page.screenshot({ path: path.join(chromeStoreDir, '5-custom-tone-presets.png') });

  // ---------------------------------------------------------------------------
  // PROMO BANNERS
  // ---------------------------------------------------------------------------
  console.log('Generating Marquee Banner: marquee-promo-1400x560.png...');
  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 1 });
  const htmlMarquee = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        body {
          width: 1400px;
          height: 560px;
          padding: 48px 64px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          background: radial-gradient(circle at 20% 30%, #1d1b27, #121118 80%);
          position: relative;
        }

        .marquee-left {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 620px;
        }

        .marquee-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(167, 139, 250, 0.3));
          border: 1px solid rgba(167, 139, 250, 0.6);
          font-size: 13px;
          font-weight: 800;
          color: #ddd6fe;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          width: fit-content;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.4);
        }

        .marquee-title-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .marquee-brand {
          font-size: 46px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .marquee-headline {
          font-size: 26px;
          font-weight: 700;
          line-height: 1.25;
          color: #ddd6fe;
          background: linear-gradient(135deg, #ffffff 0%, #ddd6fe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .marquee-subtitle {
          font-size: 16px;
          color: var(--fg-muted);
          line-height: 1.5;
          font-weight: 500;
        }

        .marquee-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .marquee-pill {
          padding: 9px 16px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .marquee-pill.purple {
          border-color: rgba(167, 139, 250, 0.5);
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.25), var(--surface));
          color: #ddd6fe;
        }

        .marquee-right {
          width: 580px;
          background: rgba(23, 21, 31, 0.92);
          border: 1.5px solid var(--accent);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(167, 139, 250, 0.35);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 800;
          color: #ddd6fe;
        }

        .card-body {
          background: rgba(18, 17, 24, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 14px;
          padding: 20px;
          font-size: 16px;
          line-height: 1.6;
          color: #ffffff;
          border-left: 4px solid #10b981;
        }
      </style>
    </head>
    <body>
      <div class="marquee-left">
        <div class="marquee-badge">✦ Rewriter AI for Chrome</div>
        <div class="marquee-title-row">
          ${APP_LOGO_IMG(60)}
          <div class="marquee-brand">Rewriter AI</div>
        </div>
        <div class="marquee-headline">Instant AI Text Rewriter Across the Web</div>
        <div class="marquee-subtitle">Highlight text on Gmail, LinkedIn, Slack or Docs to polish tone, fix grammar, or make concise with Gemini, ChatGPT & Claude.</div>
        <div class="marquee-pills">
          <div class="marquee-pill purple">⚡ 1-Click Replace</div>
          <div class="marquee-pill">🔒 100% Private (BYOK)</div>
          <div class="marquee-pill">🤖 Multi-LLM Support</div>
        </div>
      </div>

      <div class="marquee-right">
        <div class="card-head">
          <div style="display:flex; align-items:center; gap:10px;">
            ${APP_LOGO_IMG(24)}
            <span>REWRITER AI INLINE WIDGET</span>
          </div>
          <span style="background: rgba(16,185,129,0.2); color:#6ee7b7; padding:4px 12px; border-radius:100px; font-family:var(--mono); font-size:11.5px;">⚡ Gemini 1.5 Flash</span>
        </div>
        <div class="card-body">
          <div style="font-size: 12px; color: #a7f3d0; font-weight: 700; margin-bottom: 6px;">✨ 52% shorter • Professional Tone</div>
          Hi Jordan, following up on last week's proposal. Have you had a chance to review it with your team? Let me know if you have any questions or want to hop on a quick call.
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlMarquee, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(chromePromoDir, 'marquee-promo-1400x560.png') });

  console.log('Generating Store Promo Tile: promo-tile-440x280.png...');
  await page.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 });
  const htmlSmallPromo = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        body {
          width: 440px;
          height: 280px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: radial-gradient(circle at 10% 20%, #1d1b27, #121118 80%);
          position: relative;
        }

        .promo-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .promo-title-group {
          display: flex;
          flex-direction: column;
        }

        .promo-brand {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
        }

        .promo-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .promo-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .promo-headline {
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
          color: #ffffff;
        }

        .promo-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .promo-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 6px;
          background: var(--surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--fg);
        }

        .promo-pill.purple {
          border-color: rgba(167, 139, 250, 0.4);
          color: #ddd6fe;
          background: rgba(167, 139, 250, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="promo-header">
        ${APP_LOGO_IMG(44)}
        <div class="promo-title-group">
          <div class="promo-brand">Rewriter AI</div>
          <div class="promo-tag">Chrome Extension</div>
        </div>
      </div>

      <div class="promo-body">
        <div class="promo-headline">Rewrite, Polish & Refine Text Anywhere on the Web</div>
        <div class="promo-pills">
          <div class="promo-pill purple">✨ 1-Click Replace</div>
          <div class="promo-pill">🔒 100% Private</div>
          <div class="promo-pill">🤖 Gemini, GPT-4o & Claude</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlSmallPromo, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(chromePromoDir, 'small-promo-440x280.png') });

  await browser.close();
  console.log('🎉 Successfully generated all store screenshots & promo tiles with official base64 app logo!');
}

generateAllAssets().catch((err) => {
  console.error('❌ Error generating screenshots:', err);
  process.exit(1);
});
