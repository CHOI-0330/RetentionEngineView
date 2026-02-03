import { test, expect } from '@playwright/test';

/**
 * StudentChat 重複送信デバッグテスト
 *
 * 問題: 1つのメッセージを送信すると、2つの質問が送信される
 *
 * 調査項目:
 * 1. APIリクエストの回数
 * 2. UIに表示されるユーザーメッセージの数
 * 3. console.warn の出力（重複防止ガードの発火）
 */

test.describe('StudentChat 重複送信デバッグ', () => {
  // 認証情報（環境に合わせて調整してください）
  const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
  const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';

  test.beforeEach(async ({ page }) => {
    // コンソールログを収集
    page.on('console', (msg) => {
      if (msg.type() === 'warn' || msg.type() === 'error') {
        console.log(`[${msg.type().toUpperCase()}]`, msg.text());
      }
    });
  });

  test('1回の送信で1つだけメッセージが送信されることを確認', async ({ page }) => {
    // APIリクエストをカウント
    let messageApiCallCount = 0;
    let llmApiCallCount = 0;

    // ネットワークリクエストを監視
    page.on('request', (request) => {
      const url = request.url();

      // メッセージ送信API
      if (url.includes('/messages') && request.method() === 'POST') {
        messageApiCallCount++;
        console.log(`[API] POST /messages - Call #${messageApiCallCount}`);
      }

      // LLM生成API（ストリーミング）
      if (url.includes('/llm/generate') || url.includes('/stream')) {
        llmApiCallCount++;
        console.log(`[API] LLM Generate - Call #${llmApiCallCount}`);
      }
    });

    // 1. ログインページに移動（必要に応じて認証）
    await page.goto('/entitle/auth');

    // ログイン処理（実際の認証フローに合わせて調整）
    // 既にログイン済みの場合はスキップされる想定
    const loginForm = page.locator('form');
    if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    }

    // 2. StudentChatページに移動
    await page.goto('/student/chat');
    await page.waitForLoadState('networkidle');

    // 3. チャット入力フォームを確認
    const textarea = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // 4. 送信前のメッセージ数をカウント
    const initialUserMessages = await page.locator('[class*="justify-end"]').count();
    console.log(`[DEBUG] Initial user messages: ${initialUserMessages}`);

    // 5. メッセージを入力
    const testMessage = `テストメッセージ ${Date.now()}`;
    await textarea.fill(testMessage);

    // 6. 送信ボタンをクリック
    const sendButton = page.locator('button[type="submit"]').filter({ has: page.locator('svg') });
    await sendButton.click();

    // 7. 送信後、少し待機してからカウント
    await page.waitForTimeout(3000);

    // 8. 送信後のメッセージ数をカウント
    const finalUserMessages = await page.locator('[class*="justify-end"]').count();
    const newMessageCount = finalUserMessages - initialUserMessages;

    console.log(`[DEBUG] Final user messages: ${finalUserMessages}`);
    console.log(`[DEBUG] New user messages: ${newMessageCount}`);
    console.log(`[DEBUG] Message API calls: ${messageApiCallCount}`);
    console.log(`[DEBUG] LLM API calls: ${llmApiCallCount}`);

    // 検証
    expect(newMessageCount).toBe(1); // ユーザーメッセージは1つだけ
    expect(messageApiCallCount).toBe(1); // APIは1回だけ呼ばれる
  });

  test('Cmd+Enterでの送信も1回だけ', async ({ page }) => {
    let messageApiCallCount = 0;

    page.on('request', (request) => {
      if (request.url().includes('/messages') && request.method() === 'POST') {
        messageApiCallCount++;
        console.log(`[API] POST /messages - Call #${messageApiCallCount}`);
      }
    });

    await page.goto('/student/chat');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    const initialUserMessages = await page.locator('[class*="justify-end"]').count();

    // メッセージを入力してCmd+Enter
    await textarea.fill(`キーボードテスト ${Date.now()}`);
    await textarea.press('Meta+Enter');

    await page.waitForTimeout(3000);

    const finalUserMessages = await page.locator('[class*="justify-end"]').count();
    const newMessageCount = finalUserMessages - initialUserMessages;

    console.log(`[DEBUG] Keyboard send - New messages: ${newMessageCount}, API calls: ${messageApiCallCount}`);

    expect(newMessageCount).toBe(1);
    expect(messageApiCallCount).toBe(1);
  });

  test('素早い連打でも重複しない', async ({ page }) => {
    let messageApiCallCount = 0;

    page.on('request', (request) => {
      if (request.url().includes('/messages') && request.method() === 'POST') {
        messageApiCallCount++;
        console.log(`[API] POST /messages - Call #${messageApiCallCount}`);
      }
    });

    await page.goto('/student/chat');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder="メッセージを入力..."]');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    const initialUserMessages = await page.locator('[class*="justify-end"]').count();

    // メッセージを入力
    await textarea.fill(`連打テスト ${Date.now()}`);

    // 送信ボタンを素早く連打（5回）
    const sendButton = page.locator('button[type="submit"]').filter({ has: page.locator('svg') });

    // Promise.allで同時クリックをシミュレート
    await Promise.all([
      sendButton.click(),
      sendButton.click(),
      sendButton.click(),
      sendButton.click(),
      sendButton.click(),
    ]);

    await page.waitForTimeout(5000);

    const finalUserMessages = await page.locator('[class*="justify-end"]').count();
    const newMessageCount = finalUserMessages - initialUserMessages;

    console.log(`[DEBUG] Rapid click - New messages: ${newMessageCount}, API calls: ${messageApiCallCount}`);

    // 連打しても1回だけ送信される
    expect(newMessageCount).toBe(1);
    expect(messageApiCallCount).toBe(1);
  });

  test.skip('認証なしでデバッグ（ローカルAPIモック使用時）', async ({ page }) => {
    // このテストはAPIをモックする場合に使用
    // 実際の認証をスキップしてUIの挙動のみを確認

    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      console.log(`[MOCK] ${route.request().method()} ${url}`);

      if (url.includes('/bootstrap')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            currentUser: { userId: 'test', role: 'NEW_HIRE' },
            conversation: { convId: 'test-conv', title: 'テスト会話' },
            initialMessages: [],
          }),
        });
      } else if (url.includes('/messages')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            msgId: `msg-${Date.now()}`,
            content: 'Test message',
            status: 'DONE',
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/student/chat');
    // テスト続行...
  });
});
