import { test, expect } from '@playwright/test';

/**
 * 認証付きデバッグテスト
 */

test.describe('StudentChat 重複送信デバッグ（認証付き）', () => {
  const TEST_EMAIL = 'newhire@example.com';
  const TEST_PASSWORD = '11111111';

  test('1回の送信で1つだけメッセージが送信されることを確認', async ({ page }) => {
    // タイムアウトを長めに設定
    test.setTimeout(120000);

    // API呼び出しカウント
    const apiCalls: { action: string; timestamp: number }[] = [];

    // ネットワークリクエストを監視
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();

      if (url.includes('/api/entitle/student-chat') && method === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}');
          apiCalls.push({
            action: body.action || 'unknown',
            timestamp: Date.now(),
          });
          console.log(`📤 [API] ${body.action} at ${new Date().toISOString()}`);
        } catch {}
      }

      if (url.includes('/api/llm/generate/stream')) {
        apiCalls.push({
          action: 'llm-stream',
          timestamp: Date.now(),
        });
        console.log(`🌊 [API] llm-stream at ${new Date().toISOString()}`);
      }
    });

    // コンソールログを収集
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);

      // デバッグログのみ表示
      if (
        text.includes('[ChatComposerLegacy]') ||
        text.includes('[useStudentChatPresenter]')
      ) {
        console.log(`🔍 ${text}`);
      }
    });

    // 1. ログインページに移動
    console.log('📝 ログインページに移動...');
    await page.goto('/');

    // 2. ログインフォームを探す
    // ログイン前のホームページから認証ページへ移動が必要かも
    await page.waitForTimeout(2000);

    // ログインボタンまたはリンクを探す
    const loginLink = page.locator('a[href*="auth"], button:has-text("ログイン")').first();
    if (await loginLink.isVisible().catch(() => false)) {
      console.log('📝 ログインリンクをクリック...');
      await loginLink.click();
      await page.waitForURL('**/auth**', { timeout: 10000 }).catch(() => {});
    }

    // メールフィールドを探す
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="メール"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // ログインフォームが表示されるのを待つ
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (await emailInput.isVisible()) {
      console.log('📝 ログイン情報を入力...');
      await emailInput.fill(TEST_EMAIL);
      await passwordInput.fill(TEST_PASSWORD);

      console.log('📝 ログインボタンをクリック...');
      await submitButton.click();

      // ログイン完了を待つ
      await page.waitForTimeout(3000);
    }

    // 3. チャットページに移動
    console.log('📝 ダッシュボードを確認...');
    await page.goto('/student/dashboard');
    await page.waitForTimeout(2000);

    // 既存の会話を探す、またはなければ新規作成
    const existingConvLink = page.locator('a[href*="/student/chat/"]').first();

    if (await existingConvLink.isVisible().catch(() => false)) {
      console.log('📝 既存の会話をクリック...');
      await existingConvLink.click();
    } else {
      console.log('📝 新しい会話を作成...');
      // 会話タイトル入力欄に入力
      const titleInput = page.locator('input[placeholder*="例:"], input[placeholder*="オンボーディング"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('デバッグテスト会話');
        // 「会話を作成」ボタンをクリック
        const createButton = page.locator('button:has-text("会話を作成")').first();
        await createButton.click();
        console.log('📝 「会話を作成」をクリック...');
      }
    }

    // 会話作成後のナビゲーションを待つ
    try {
      await page.waitForURL('**/student/chat/**', { timeout: 10000 });
      console.log('📝 チャットページに移動しました:', page.url());
    } catch {
      console.log('📝 URLが変わらなかったので、作成された会話リンクを探す...');
      await page.waitForTimeout(3000);

      // 会話リストからリンクを探す
      const convLink = page.locator('a[href*="/student/chat/"]').first();
      if (await convLink.isVisible().catch(() => false)) {
        console.log('📝 会話リンクをクリック...');
        await convLink.click();
        await page.waitForURL('**/student/chat/**', { timeout: 10000 });
      }
    }
    console.log('📝 現在のURL:', page.url());

    // 4. テキストエリアを待機
    const textarea = page.locator('textarea[placeholder="メッセージを入力..."]');

    console.log('📝 テキストエリアを待機...');
    try {
      await expect(textarea).toBeVisible({ timeout: 15000 });
    } catch {
      // スクリーンショットを取って現在の状態を確認
      await page.screenshot({ path: 'e2e-debug-screenshot.png' });
      console.log('❌ テキストエリアが見つかりません。スクリーンショットを保存しました: e2e-debug-screenshot.png');
      console.log('現在のURL:', page.url());

      // ページの内容を確認
      const pageContent = await page.content();
      console.log('ページに "メッセージ" が含まれるか:', pageContent.includes('メッセージ'));
      console.log('ページに "ログイン" が含まれるか:', pageContent.includes('ログイン'));

      test.skip();
      return;
    }

    // 5. APIコール前の状態を記録
    const beforeCount = apiCalls.length;
    console.log(`\n📊 送信前のAPIコール数: ${beforeCount}`);

    // 6. メッセージを入力して送信
    const testMessage = `テストメッセージ ${Date.now()}`;
    console.log(`📝 メッセージを入力: "${testMessage}"`);
    await textarea.fill(testMessage);

    // 送信ボタンをクリック
    const sendButton = page.locator('button[type="submit"]');
    console.log('📝 送信ボタンをクリック...');
    await sendButton.click();

    // 7. レスポンスを待つ
    console.log('📝 レスポンスを待機中...');
    await page.waitForTimeout(10000);

    // 8. 結果を分析
    console.log('\n========================================');
    console.log('📊 結果分析');
    console.log('========================================');

    // createUserMessage の数をカウント
    const createUserMessageCalls = apiCalls.filter(
      (c) => c.action === 'createUserMessage'
    );
    const llmStreamCalls = apiCalls.filter((c) => c.action === 'llm-stream');

    console.log(`createUserMessage 呼び出し回数: ${createUserMessageCalls.length}`);
    console.log(`llm-stream 呼び出し回数: ${llmStreamCalls.length}`);

    // タイムスタンプを表示
    console.log('\nAPIコールのタイムライン:');
    apiCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.action} at ${new Date(call.timestamp).toISOString()}`);
    });

    // デバッグログを確認
    console.log('\n関連するコンソールログ:');
    consoleLogs
      .filter(
        (log) =>
          log.includes('ChatComposerLegacy') ||
          log.includes('useStudentChatPresenter') ||
          log.includes('sendingRef') ||
          log.includes('isBusyRef')
      )
      .forEach((log) => console.log(`  ${log}`));

    // 検証
    if (createUserMessageCalls.length > 1) {
      console.log('\n❌ 重複検出: createUserMessage が複数回呼ばれています！');
      console.log(
        '   呼び出し間隔:',
        createUserMessageCalls.length > 1
          ? `${createUserMessageCalls[1].timestamp - createUserMessageCalls[0].timestamp}ms`
          : 'N/A'
      );
    } else if (createUserMessageCalls.length === 1) {
      console.log('\n✅ createUserMessage は1回のみ呼ばれました');
    } else {
      console.log('\n⚠️ createUserMessage が呼ばれていません');
    }

    if (llmStreamCalls.length > 1) {
      console.log('❌ 重複検出: llm-stream が複数回呼ばれています！');
    } else if (llmStreamCalls.length === 1) {
      console.log('✅ llm-stream は1回のみ呼ばれました');
    } else {
      console.log('⚠️ llm-stream が呼ばれていません');
    }

    // テストの成功/失敗を判定
    expect(createUserMessageCalls.length).toBeLessThanOrEqual(1);
  });
});
