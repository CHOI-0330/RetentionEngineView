import { test, expect } from '@playwright/test';

/**
 * 手動デバッグ用テスト
 *
 * 使用方法:
 * 1. npm run test:e2e:debug -- e2e/manual-debug.spec.ts
 * 2. ブラウザが開いたら、手動でログイン
 * 3. チャットページに移動
 * 4. メッセージを送信
 * 5. コンソールログとネットワークリクエストを確認
 *
 * または:
 * npm run test:e2e:ui -- e2e/manual-debug.spec.ts
 */

test.describe('手動デバッグ', () => {
  test('重複送信デバッグ（手動操作）', async ({ page }) => {
    // API呼び出しカウント
    const apiCalls = {
      messages: 0,
      llmGenerate: 0,
      llmStream: 0,
    };

    // ネットワークリクエストを監視
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();

      if (url.includes('/api/entitle/student-chat') && method === 'POST') {
        apiCalls.messages++;
        console.log(`📤 [API ${apiCalls.messages}] POST /api/entitle/student-chat`);
        try {
          const body = JSON.parse(request.postData() || '{}');
          console.log(`   Action: ${body.action}`);
        } catch {}
      }

      if (url.includes('/api/llm/generate') && !url.includes('/stream')) {
        apiCalls.llmGenerate++;
        console.log(`🤖 [API ${apiCalls.llmGenerate}] POST /api/llm/generate`);
      }

      if (url.includes('/api/llm/generate/stream')) {
        apiCalls.llmStream++;
        console.log(`🌊 [API ${apiCalls.llmStream}] POST /api/llm/generate/stream`);
      }
    });

    // コンソールログを全て表示
    page.on('console', (msg) => {
      const text = msg.text();
      // デバッグログのみフィルタ
      if (
        text.includes('[ChatComposerLegacy]') ||
        text.includes('[useStudentChatPresenter]') ||
        text.includes('[StudentChatService]') ||
        text.includes('[llm-generate]')
      ) {
        console.log(`🔍 [CONSOLE ${msg.type().toUpperCase()}] ${text}`);
      }
    });

    // デバッグ用に長いタイムアウト
    test.setTimeout(300000); // 5分

    // 最初にホームページへ
    await page.goto('/');

    console.log('\n========================================');
    console.log('📋 手動デバッグ手順:');
    console.log('1. ブラウザでログインしてください');
    console.log('2. /student/chat/[convId] に移動してください');
    console.log('3. メッセージを入力して送信してください');
    console.log('4. コンソールログとAPIコール数を確認してください');
    console.log('5. テストを終了するには Ctrl+C');
    console.log('========================================\n');

    // 手動操作を待つ（5分間）
    // この間にユーザーが操作できる
    await page.waitForTimeout(300000);

    // 最終結果を表示
    console.log('\n========================================');
    console.log('📊 API呼び出し結果:');
    console.log(`   Messages API: ${apiCalls.messages} 回`);
    console.log(`   LLM Generate API: ${apiCalls.llmGenerate} 回`);
    console.log(`   LLM Stream API: ${apiCalls.llmStream} 回`);
    console.log('========================================\n');

    // 正常であれば各APIは1回ずつ
    // expect(apiCalls.messages).toBe(1);
    // expect(apiCalls.llmStream).toBe(1);
  });

  test('自動送信テスト（認証後）', async ({ page }) => {
    // 認証状態を保持するセットアップ
    // Note: 実際の認証はglobal-setupで設定するか、storageStateを使用

    const apiCalls = {
      createUserMessage: 0,
      llmStream: 0,
    };

    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();

      if (url.includes('/api/entitle/student-chat') && method === 'POST') {
        try {
          const body = JSON.parse(request.postData() || '{}');
          if (body.action === 'createUserMessage') {
            apiCalls.createUserMessage++;
            console.log(`📤 createUserMessage #${apiCalls.createUserMessage}`);
          }
        } catch {}
      }

      if (url.includes('/api/llm/generate/stream')) {
        apiCalls.llmStream++;
        console.log(`🌊 llm/generate/stream #${apiCalls.llmStream}`);
      }
    });

    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('[ChatComposerLegacy]') ||
        text.includes('[useStudentChatPresenter]')
      ) {
        console.log(`🔍 ${text}`);
      }
    });

    // チャットページに直接アクセス（認証済み想定）
    // 実際のconvIdに置き換えてください
    await page.goto('/student/chat');

    // ページ読み込みを待機
    await page.waitForLoadState('networkidle');

    // テキストエリアを待機
    const textarea = page.locator('textarea[placeholder="メッセージを入力..."]');

    // 10秒待ってもテキストエリアが見つからなければスキップ
    const isVisible = await textarea.isVisible().catch(() => false);
    if (!isVisible) {
      console.log('⚠️ テキストエリアが見つかりません。認証が必要かもしれません。');
      test.skip();
      return;
    }

    // メッセージを入力
    const testMessage = `デバッグテスト ${Date.now()}`;
    await textarea.fill(testMessage);

    // 送信前の状態をログ
    console.log('\n--- 送信前 ---');
    console.log(`createUserMessage calls: ${apiCalls.createUserMessage}`);
    console.log(`llmStream calls: ${apiCalls.llmStream}`);

    // 送信ボタンをクリック
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // APIコールを待機
    await page.waitForTimeout(5000);

    // 結果を確認
    console.log('\n--- 送信後 ---');
    console.log(`createUserMessage calls: ${apiCalls.createUserMessage}`);
    console.log(`llmStream calls: ${apiCalls.llmStream}`);

    // 重複がないことを確認
    if (apiCalls.createUserMessage > 1) {
      console.error('❌ createUserMessage が複数回呼ばれています！');
    } else {
      console.log('✅ createUserMessage は1回のみ');
    }

    if (apiCalls.llmStream > 1) {
      console.error('❌ llmStream が複数回呼ばれています！');
    } else {
      console.log('✅ llmStream は1回のみ');
    }
  });
});
