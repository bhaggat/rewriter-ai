import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const storeDir = path.join(rootDir, 'store-assets', 'screenshots');
const siteDir = path.join(rootDir, 'site-assets');

if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateScreenshots() {
  console.log('Launching headless browser...');
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

  const baseCss = `
    :root {
      color-scheme: dark;
      --bg: #121118;
      --bg-deep: #0b0a0f;
      --surface: #17151f;
      --surface-raised: #1d1b27;
      --border: #2b2937;
      --border-strong: #3d3950;
      --fg: #f3f2fa;
      --fg-muted: #c7c3d9;
      --muted: #8f8aa3;
      --accent: #a78bfa;
      --accent-strong: #8b5cf6;
      --accent-ink: #ded4ff;
      --accent-fg: #181622;
      --blue: #4d8bff;
      --green: #34d399;
      --glow: 0 0 16px rgba(167, 139, 250, 0.4);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: 1280px;
      height: 800px;
      background: var(--bg-deep);
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(167, 139, 250, 0.14), transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(77, 139, 255, 0.1), transparent 45%);
      font-family: var(--sans);
      color: var(--fg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      -webkit-font-smoothing: antialiased;
    }

    .browser-frame {
      width: 1140px;
      height: 710px;
      background: var(--bg);
      border: 1px solid var(--border-strong);
      border-radius: 14px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .browser-bar {
      height: 42px;
      background: var(--surface-raised);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      flex-shrink: 0;
    }

    .browser-dots {
      display: flex;
      gap: 7px;
    }

    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }

    .browser-address {
      flex: 1;
      height: 26px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      gap: 8px;
    }

    .browser-content {
      flex: 1;
      position: relative;
      background: var(--surface);
      overflow: hidden;
    }
  `;

  // ---------------------------------------------------------------------------
  // SCREENSHOT 1: Inline Rewrite Presets
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 1: 1-inline-rewrite-presets.png...');
  const htmlScreen1 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .web-mail-app {
          padding: 36px 50px;
          height: 100%;
          background: #14121c;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mail-card {
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
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
        .mail-row {
          display: flex;
          gap: 12px;
          font-size: 13.5px;
          align-items: center;
        }
        .mail-label { color: var(--muted); width: 64px; font-weight: 500; }
        .mail-value { color: var(--fg); font-weight: 500; }
        .editor-area {
          position: relative;
          min-height: 240px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--fg-muted);
          padding: 16px;
          border-radius: 10px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border);
        }
        .selected-text {
          background: rgba(167, 139, 250, 0.25);
          color: #ffffff;
          padding: 2px 4px;
          border-radius: 4px;
          box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.4);
        }
        
        /* Floating trigger button */
        .rw-trigger-icon {
          position: absolute;
          top: 108px;
          right: 28px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--glow), 0 4px 16px rgba(0,0,0,0.4);
          cursor: pointer;
          font-size: 15px;
        }

        /* Inline Popover */
        .rw-popover {
          position: absolute;
          top: 120px;
          left: 170px;
          width: 460px;
          background: rgba(18, 16, 26, 0.98);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px rgba(0,0,0,0.75), var(--glow);
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
          font-size: 11.5px;
          font-weight: 700;
          color: var(--accent-ink);
          letter-spacing: 0.04em;
        }
        .popover-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(167, 139, 250, 0.14);
          border: 1px solid rgba(167, 139, 250, 0.3);
          border-radius: 100px;
          font-size: 11px;
          color: var(--accent);
          font-family: var(--mono);
        }
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .preset-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--fg);
          cursor: pointer;
        }
        .preset-chip.active {
          border-color: var(--accent);
          background: rgba(167, 139, 250, 0.18);
          color: #fff;
          font-weight: 600;
        }
        .custom-input-group {
          display: flex;
          gap: 8px;
        }
        .custom-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 13px;
          color: var(--fg);
          outline: none;
        }
        .btn-go {
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          color: #fff;
          font-weight: 600;
          border: none;
          padding: 0 18px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
        }
        .shortcut-tip {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          padding-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        kbd {
          font-family: var(--mono);
          background: var(--surface-raised);
          border: 1px solid var(--border);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            mail.google.com/mail/u/0/#inbox?compose=new
          </div>
        </div>
        <div class="browser-content">
          <div class="web-mail-app">
            <div class="mail-card">
              <div class="mail-header">
                <div class="mail-row"><span class="mail-label">To:</span><span class="mail-value">jordan.smith@acme-corp.com</span></div>
                <div class="mail-row"><span class="mail-label">Subject:</span><span class="mail-value">Project Proposal Follow-up & Next Steps</span></div>
              </div>
              <div class="editor-area">
                Hi Jordan,<br/><br/>
                <span class="selected-text">I'm just writing to check in regarding the updated project proposal we submitted last Thursday. Please let me know if you've had a moment to review it with your team, or if you have any questions or feedback. I am available for a brief sync whenever convenient for you.</span>
              </div>
            </div>

            <div class="rw-popover">
              <div class="popover-head">
                <span>✦ REWRITER AI INLINE</span>
                <span class="popover-badge">Gemini 1.5 Flash</span>
              </div>
              <div class="preset-grid">
                <div class="preset-chip active">✦ Concise</div>
                <div class="preset-chip">💼 Formal</div>
                <div class="preset-chip">😊 Friendly</div>
                <div class="preset-chip">✨ Fix Grammar</div>
                <div class="preset-chip">🎯 Professional</div>
                <div class="preset-chip">📝 Summarize</div>
              </div>
              <div class="custom-input-group">
                <input class="custom-input" value="Make this email short, confident and professional" />
                <button class="btn-go">Rewrite</button>
              </div>
              <div class="shortcut-tip">
                <span>Shortcut: <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd></span>
                <span style="color: var(--accent);">Settings ⚙️</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen1, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(storeDir, '1-inline-rewrite-presets.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 2: Inline Rewrite Result
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 2: 2-inline-rewrite-result.png...');
  const htmlScreen2 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .web-mail-app {
          padding: 36px 50px;
          height: 100%;
          background: #14121c;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mail-card {
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
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
        .mail-row {
          display: flex;
          gap: 12px;
          font-size: 13.5px;
          align-items: center;
        }
        .mail-label { color: var(--muted); width: 64px; font-weight: 500; }
        .mail-value { color: var(--fg); font-weight: 500; }
        .editor-area {
          position: relative;
          min-height: 240px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--fg-muted);
          padding: 16px;
          border-radius: 10px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border);
        }
        .original-faded {
          opacity: 0.35;
          text-decoration: line-through;
        }

        .rw-popover {
          position: absolute;
          top: 115px;
          left: 160px;
          width: 490px;
          background: rgba(18, 16, 26, 0.98);
          backdrop-filter: blur(24px);
          border: 1px solid var(--accent);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px rgba(0,0,0,0.8), var(--glow);
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
          font-size: 11.5px;
          font-weight: 700;
          color: var(--green);
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.04em;
        }
        .model-tag {
          font-family: var(--mono);
          font-size: 11px;
          background: rgba(167, 139, 250, 0.14);
          color: var(--accent);
          border: 1px solid rgba(167, 139, 250, 0.3);
          padding: 3px 8px;
          border-radius: 100px;
        }
        .result-text-box {
          background: rgba(0,0,0,0.35);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 14.5px;
          line-height: 1.55;
          color: #ffffff;
          border-left: 3px solid var(--accent);
        }
        .action-row {
          display: flex;
          gap: 10px;
        }
        .btn-replace {
          flex: 1;
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
        }
        .btn-secondary {
          background: var(--surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--fg);
          font-weight: 500;
          font-size: 13px;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            mail.google.com/mail/u/0/#inbox?compose=new
          </div>
        </div>
        <div class="browser-content">
          <div class="web-mail-app">
            <div class="mail-card">
              <div class="mail-header">
                <div class="mail-row"><span class="mail-label">To:</span><span class="mail-value">jordan.smith@acme-corp.com</span></div>
                <div class="mail-row"><span class="mail-label">Subject:</span><span class="mail-value">Project Proposal Follow-up & Next Steps</span></div>
              </div>
              <div class="editor-area">
                Hi Jordan,<br/><br/>
                <span class="original-faded">I'm just writing to check in regarding the updated project proposal we submitted last Thursday. Please let me know if you've had a moment to review it with your team...</span>
              </div>
            </div>

            <div class="rw-popover">
              <div class="result-head">
                <div class="result-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  REWRITTEN RESULT (CONCISE & CONFIDENT)
                </div>
                <span class="model-tag">✦ Gemini 1.5 Flash</span>
              </div>
              <div class="result-text-box">
                Hi Jordan, following up on last week's proposal. Have you had a chance to review it with your team? Let me know if you have any questions or want to hop on a quick call.
              </div>
              <div class="action-row">
                <button class="btn-replace">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Replace Text
                </button>
                <button class="btn-secondary">📋 Copy</button>
                <button class="btn-secondary">🔄 Try another</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen2, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(storeDir, '2-inline-rewrite-result.png') });
  await page.screenshot({ path: path.join(siteDir, 'screenshot-hero.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 3: Options Page - API Keys & Providers
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 3: 3-options-api-keys.png...');
  const htmlScreen3 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .options-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
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
          font-weight: 700;
        }
        .brand-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--blue), var(--accent-strong));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: bold;
        }
        .btn-info {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--accent);
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .privacy-box {
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.08), rgba(77, 139, 255, 0.08));
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12.5px;
          color: var(--fg-muted);
        }
        .section-box {
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sec-title {
          font-size: 14.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-ink);
        }
        .provider-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .provider-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .provider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .provider-name {
          font-size: 13.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dot-status {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
        }
        .input-row {
          display: flex;
          gap: 8px;
        }
        .key-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: var(--mono);
          font-size: 12px;
          color: var(--fg);
        }
        .btn-validate {
          padding: 6px 14px;
          background: var(--surface-raised);
          border: 1px solid var(--border-strong);
          color: var(--fg);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
        }
        .model-select {
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--fg-muted);
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            chrome-extension://rewriter-ai/options.html
          </div>
        </div>
        <div class="browser-content">
          <div class="options-container">
            <div class="opt-header">
              <div class="brand-title">
                <div class="brand-logo">✦</div>
                Rewriter AI Settings
              </div>
              <button class="btn-info">ℹ️ About & Extension Guide</button>
            </div>

            <div class="privacy-box">
              <span style="font-size: 18px;">🔒</span>
              <div>
                <strong style="color: var(--fg);">Zero Server Architecture:</strong> Your API keys stay encrypted in your local browser storage. Requests connect straight to the AI providers (OpenAI, Gemini, Anthropic, Groq).
              </div>
            </div>

            <div class="section-box">
              <div class="sec-title">🔑 Configured API Keys & Providers</div>
              <div class="provider-grid">
                <!-- Gemini -->
                <div class="provider-card">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status"></span> Google Gemini</span>
                    <span style="font-size: 11px; color: var(--green); font-weight: 600;">✓ Validated</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" value="AIzaSyA8x9...k2L9900x" type="password" />
                    <button class="btn-validate">Validate Key</button>
                  </div>
                  <div class="model-select">Default Model: Gemini 1.5 Flash (Fast & Cost Effective)</div>
                </div>

                <!-- ChatGPT -->
                <div class="provider-card">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status"></span> ChatGPT (OpenAI)</span>
                    <span style="font-size: 11px; color: var(--green); font-weight: 600;">✓ Validated</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" value="sk-proj-992...xx811" type="password" />
                    <button class="btn-validate">Validate Key</button>
                  </div>
                  <div class="model-select">Default Model: GPT-4o (High Intelligence)</div>
                </div>

                <!-- Claude -->
                <div class="provider-card">
                  <div class="provider-row">
                    <span class="provider-name"><span class="dot-status" style="background: var(--muted); box-shadow: none;"></span> Anthropic Claude</span>
                    <span style="font-size: 11px; color: var(--accent);">Get key ↗</span>
                  </div>
                  <div class="input-row">
                    <input class="key-input" placeholder="sk-ant-api03..." />
                    <button class="btn-validate">Validate Key</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen3, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(storeDir, '3-options-api-keys.png') });
  await page.screenshot({ path: path.join(siteDir, 'screenshot-options.png') });

  // ---------------------------------------------------------------------------
  // SCREENSHOT 4: Options Page - Presets & Floating Controls
  // ---------------------------------------------------------------------------
  console.log('Generating Screenshot 4: 4-options-presets.png...');
  const htmlScreen4 = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${baseCss}
        .options-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px 32px 48px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
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
          font-weight: 700;
        }
        .brand-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--blue), var(--accent-strong));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: bold;
        }
        .section-box {
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sec-title {
          font-size: 14.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-ink);
        }
        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .preset-item {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
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
          font-size: 13.5px;
          font-weight: 600;
          color: var(--fg);
        }
        .preset-prompt {
          font-size: 12px;
          color: var(--muted);
        }
        .btn-action {
          padding: 5px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--fg-muted);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .btn-add {
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          color: #fff;
          font-weight: 600;
          border: none;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          align-self: flex-start;
          cursor: pointer;
        }
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }
        .toggle-switch {
          width: 42px;
          height: 22px;
          background: var(--accent);
          border-radius: 100px;
          position: relative;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          right: 3px;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div class="browser-frame">
        <div class="browser-bar">
          <div class="browser-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="browser-address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            chrome-extension://rewriter-ai/options.html#presets
          </div>
        </div>
        <div class="browser-content">
          <div class="options-container">
            <div class="opt-header">
              <div class="brand-title">
                <div class="brand-logo">✦</div>
                Presets & Extension Preferences
              </div>
            </div>

            <div class="section-box">
              <div class="sec-title">✨ Quick Rewrite Presets</div>
              <div class="preset-list">
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">✦ Concise</span>
                    <span class="preset-prompt">Rewrite the text to be punchy, brief and clear without losing core details.</span>
                  </div>
                  <button class="btn-action">Edit</button>
                </div>
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">💼 Formal & Executive</span>
                    <span class="preset-prompt">Rewrite in a polished, professional tone suitable for executives or clients.</span>
                  </div>
                  <button class="btn-action">Edit</button>
                </div>
                <div class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">😊 Warm & Friendly</span>
                    <span class="preset-prompt">Adopt an engaging, approachable tone with positive language.</span>
                  </div>
                  <button class="btn-action">Edit</button>
                </div>
              </div>
              <button class="btn-add">+ Add Custom Preset</button>
            </div>

            <div class="section-box">
              <div class="sec-title">⚙️ Floating Bar & Site Exclusions</div>
              <div class="toggle-row">
                <div>
                  <strong style="font-size: 13.5px;">Show floating rewriter button on text selection</strong>
                  <div style="font-size: 12px; color: var(--muted);">Appears automatically when you highlight text in any field</div>
                </div>
                <div class="toggle-switch"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlScreen4, { waitUntil: 'domcontentloaded' });
  await delay(300);
  await page.screenshot({ path: path.join(storeDir, '4-options-presets.png') });

  await browser.close();
  console.log('Successfully generated all 4 screenshots!');
}

generateScreenshots().catch((err) => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
