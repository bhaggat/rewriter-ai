# Chrome Web Store Automated Deployment & Submission Guide

This guide explains how automated builds, zipping, and submissions to the Chrome Web Store are set up for **Rewriter AI**.

---

## 1. Extension Details

- **Extension ID:** `dfeikdphcfjnkdeolkcnblpdokkcddlm`
- **Publisher ID:** `adbed94e-07c7-40cf-a800-ededc8b898b1`
- **Store Edit URL:** [Chrome Developer Console](https://chrome.google.com/webstore/devconsole/adbed94e-07c7-40cf-a800-ededc8b898b1/dfeikdphcfjnkdeolkcnblpdokkcddlm/edit)

---

## 2. Generating Chrome Web Store API Credentials

To allow GitHub Actions or your local terminal to upload packages and submit them for review automatically, you need Chrome Web Store API credentials.

### Method 1: OAuth2 Credentials (Recommended)

1. **Enable Chrome Web Store API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create or select a Google Cloud Project.
   - Go to **APIs & Services** > **Library**, search for **Chrome Web Store API**, and click **Enable**.

2. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services** > **OAuth consent screen**.
   - Select **External**, fill in app details, and add your Chrome Web Store developer Google account under **Test Users**.

3. **Create OAuth Client ID:**
   - Go to **APIs & Services** > **Credentials**.
   - Click **Create Credentials** > **OAuth client ID**.
   - Choose **Desktop App** (or Web Application).
   - Save the generated **Client ID** and **Client Secret**.

4. **Get Refresh Token:**
   - You can get a refresh token using WXT's interactive tool by running:
     ```bash
     npx publish-extension init
     ```
   - Follow the prompts for Chrome Web Store to authenticate and retrieve your `Refresh Token`.

---

## 3. Configuring GitHub Repository Secrets

Add your credentials to your GitHub repository secrets so GitHub Actions can deploy:

1. Open [GitHub Repository Secrets Settings](https://github.com/bhaggat/rewriter-ai/settings/secrets/actions).
2. Click **New repository secret** for each of the following:

| Secret Name | Description / Value |
|---|---|
| `CHROME_EXTENSION_ID` | `dfeikdphcfjnkdeolkcnblpdokkcddlm` |
| `CHROME_CLIENT_ID` | Your OAuth Client ID from Google Cloud Console |
| `CHROME_CLIENT_SECRET` | Your OAuth Client Secret from Google Cloud Console |
| `CHROME_REFRESH_TOKEN` | Your OAuth Refresh Token |

*(Optional for Chrome Web Store API v2 Service Account):*
- `CHROME_PUBLISHER_ID`: `adbed94e-07c7-40cf-a800-ededc8b898b1`
- `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`: Service account email
- `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`: Private key

---

## 4. How to Trigger Deployment

### Option A: Automatic Deployment on Release Tag (Recommended)

Whenever you bump the version in `package.json` and push a git version tag, GitHub Actions will automatically build, zip, upload to Chrome Web Store, submit for review, and create a GitHub Release:

```bash
# 1. Commit your changes
git add .
git commit -m "release: v1.0.1"

# 2. Create and push tag
git tag v1.0.1
git push origin main --tags
```

### Option B: Manual Trigger via GitHub Actions UI

1. Go to the **Actions** tab on your GitHub repository.
2. Select **Auto Deploy to Chrome Web Store** workflow on the left menu.
3. Click **Run workflow** -> **Run workflow**.

### Option C: Manual Trigger from Local Terminal

1. Create a `.env` file from `.env.example` in the project root:
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials in `.env`.
3. Run the submission command:
   ```bash
   npm run submit
   ```
