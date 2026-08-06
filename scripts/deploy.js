import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipBump = args.includes('--no-bump');
const skipSubmit = args.includes('--skip-submit') || args.includes('--upload-only');

// Find version type (patch, minor, major, or version number)
const versionArg = args.find(a => !a.startsWith('--')) || 'patch';

// Read package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format in package.json: ${version}`);
  }
  let [major, minor, patch] = parts;
  if (type === 'major') {
    major++;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor++;
    patch = 0;
  } else if (type === 'patch') {
    patch++;
  } else if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type;
  } else {
    throw new Error(`Unknown bump type or version: ${type}`);
  }
  return `${major}.${minor}.${patch}`;
}

let newVersion = currentVersion;
if (!skipBump) {
  newVersion = bumpVersion(currentVersion, versionArg);
  console.log(`\n🚀 Bumping version: ${currentVersion} ➔ ${newVersion}`);
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Also bump package-lock.json if it exists
  const lockPath = path.join(rootDir, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      lock.version = newVersion;
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = newVersion;
      }
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    } catch (e) {
      console.warn('⚠️ Could not update package-lock.json version:', e.message);
    }
  }
} else {
  console.log(`\n📦 Deploying current version: ${currentVersion}`);
}

// Build and package extension
console.log(`\n📦 Building & Zipping Chrome Extension v${newVersion}...`);
execSync('npx wxt zip', { cwd: rootDir, stdio: 'inherit' });

// Locate created zip file
const distDir = path.join(rootDir, 'dist');
const files = fs.readdirSync(distDir);
const matchingZip = files.find(f => f.endsWith('.zip') && f.includes(newVersion));
const fallbackZip = files.find(f => f.endsWith('.zip'));
const zipFile = matchingZip || fallbackZip;

if (!zipFile) {
  console.error('❌ Error: No zip file found in dist directory!');
  process.exit(1);
}

const targetZipPath = path.join('dist', zipFile);
console.log(`\n📦 Zip created: ${targetZipPath}`);

// Submit to Chrome Web Store
console.log(`\n🌐 Submitting to Chrome Web Store${isDryRun ? ' (DRY RUN)' : ''}...`);
let flags = `--chrome-zip ${targetZipPath}`;
if (isDryRun) flags += ' --dry-run';
if (skipSubmit) flags += ' --chrome-skip-submit-review';

const submitCmd = `npx wxt submit ${flags}`;
console.log(`Executing: ${submitCmd}`);

try {
  execSync(submitCmd, { cwd: rootDir, stdio: 'inherit' });
  console.log(`\n🎉 Successfully ${skipSubmit ? 'uploaded' : 'deployed'} version ${newVersion} to Chrome Web Store!`);
} catch (err) {
  console.error('\n❌ Submission failed.');
  console.error('\n💡 Note: If Chrome Web Store requires "Privacy practices" to be filled out:');
  console.error('   1. Visit https://chrome.google.com/webstore/devconsole');
  console.error('   2. Select your extension and complete the "Privacy practices" tab.');
  console.error('   3. Alternatively, run `npm run upload` to upload the ZIP draft without submitting for review immediately.');
  process.exit(1);
}
