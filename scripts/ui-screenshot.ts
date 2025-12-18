/**
 * UI Screenshot Automation Script
 *
 * 사용법:
 *   npx ts-node scripts/ui-screenshot.ts [page-path] [output-name]
 *
 * 예시:
 *   npx ts-node scripts/ui-screenshot.ts /student/ai-settings ai-settings
 *   npx ts-node scripts/ui-screenshot.ts /student/dashboard dashboard
 *
 * 인증 상태 재생성:
 *   npx ts-node scripts/ui-screenshot.ts --login
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const AUTH_STATE_PATH = path.join(__dirname, '../.playwright-auth.json');
const SCREENSHOT_DIR = path.join(__dirname, '../.screenshots');

// 테스트 계정 정보
const TEST_CREDENTIALS = {
  email: 'newhire@mail.com',
  password: '11111111',
};

interface ScreenshotOptions {
  pagePath: string;
  outputName: string;
  fullPage?: boolean;
  waitForSelector?: string;
}

async function ensureDirectoryExists(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function login(page: Page): Promise<void> {
  console.log('🔐 로그인 중...');

  await page.goto(BASE_URL);
  await page.waitForSelector('input[type="email"], input[placeholder*="email"]', { timeout: 10000 });

  // 이메일 입력
  await page.fill('input[type="email"], input[placeholder*="email"]', TEST_CREDENTIALS.email);

  // 비밀번호 입력
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);

  // 로그인 버튼 클릭
  await page.click('button:has-text("ログイン")');

  // 대시보드 로딩 대기
  await page.waitForURL('**/student/dashboard', { timeout: 15000 });

  console.log('✅ 로그인 성공');
}

async function saveAuthState(page: Page): Promise<void> {
  const context = page.context();
  await context.storageState({ path: AUTH_STATE_PATH });
  console.log(`💾 인증 상태 저장됨: ${AUTH_STATE_PATH}`);
}

async function takeScreenshot(options: ScreenshotOptions): Promise<string> {
  const { pagePath, outputName, fullPage = true, waitForSelector } = options;

  let browser: Browser | null = null;

  try {
    // 인증 상태 확인
    const hasAuthState = fs.existsSync(AUTH_STATE_PATH);

    browser = await chromium.launch({ headless: true });

    const context = hasAuthState
      ? await browser.newContext({ storageState: AUTH_STATE_PATH })
      : await browser.newContext();

    const page = await context.newPage();

    // 인증 상태가 없으면 로그인
    if (!hasAuthState) {
      await login(page);
      await saveAuthState(page);
    }

    // 페이지 이동
    const url = `${BASE_URL}${pagePath}`;
    console.log(`📄 페이지 이동: ${url}`);
    await page.goto(url);

    // 특정 셀렉터 대기 (선택사항)
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    } else {
      // 기본 로딩 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // 추가 렌더링 대기
    }

    // 스크린샷 저장
    await ensureDirectoryExists(SCREENSHOT_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${outputName}-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    await page.screenshot({
      path: filepath,
      fullPage,
    });

    console.log(`📸 스크린샷 저장됨: ${filepath}`);

    await browser.close();
    return filepath;

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

async function refreshAuthState(): Promise<void> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page);
    await saveAuthState(page);

    await browser.close();
    console.log('🔄 인증 상태 갱신 완료');

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// CLI 실행
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
UI Screenshot Tool
==================

사용법:
  npx ts-node scripts/ui-screenshot.ts [page-path] [output-name]
  npx ts-node scripts/ui-screenshot.ts --login

예시:
  npx ts-node scripts/ui-screenshot.ts /student/ai-settings ai-settings
  npx ts-node scripts/ui-screenshot.ts /student/dashboard dashboard
  npx ts-node scripts/ui-screenshot.ts --login  # 인증 상태 갱신

주요 페이지:
  /student/dashboard     - 대시보드
  /student/ai-settings   - AI 설정
  /profile               - 프로필
`);
    return;
  }

  if (args[0] === '--login') {
    await refreshAuthState();
    return;
  }

  const pagePath = args[0];
  const outputName = args[1] || pagePath.replace(/\//g, '-').slice(1);

  await takeScreenshot({ pagePath, outputName });
}

main().catch((error) => {
  console.error('❌ 에러:', error.message);
  process.exit(1);
});

export { takeScreenshot, refreshAuthState, ScreenshotOptions };
