const { test, expect } = require('@playwright/test');

test.describe('Event Sourcing電卓 E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // テスト前にsessionStorageをクリア
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
  });

  test('シナリオ1: 基本的な足し算の計算', async ({ page }) => {
    // 1+2=3を計算
    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '+', exact: true }).first().click();
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '=' }).click();

    // 結果が3であることを確認
    const result = await page.locator('#result').inputValue();
    expect(result).toBe('3');
  });

  test('シナリオ2: 複数の演算（掛け算と引き算）', async ({ page }) => {
    // 5*3-2=13を計算
    await page.getByRole('button', { name: '5' }).click();
    await page.getByRole('button', { name: '*' }).click();
    await page.getByRole('button', { name: '3' }).click();
    await page.getByRole('button', { name: '-' }).click();
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '=' }).click();

    // 結果が13であることを確認
    const result = await page.locator('#result').inputValue();
    expect(result).toBe('13');
  });

  test('シナリオ3: クリア機能のテスト', async ({ page }) => {
    // 123を入力
    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '3' }).click();

    // 入力が表示されていることを確認
    let result = await page.locator('#result').inputValue();
    expect(result).toBe('123');

    // クリアボタンを押す
    await page.getByRole('button', { name: 'C' }).click();

    // 結果が空であることを確認
    result = await page.locator('#result').inputValue();
    expect(result).toBe('');
  });

  test('シナリオ4: Undo/Redo機能のテスト', async ({ page }) => {
    // 1+2を入力
    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '+', exact: true }).first().click();
    await page.getByRole('button', { name: '2' }).click();

    // 入力が表示されていることを確認
    let result = await page.locator('#result').inputValue();
    expect(result).toBe('1+2');

    // Undoを押す（2が消える）
    await page.getByRole('button', { name: '↶ Undo' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('1+');

    // もう一度Undoを押す（+が消える）
    await page.getByRole('button', { name: '↶ Undo' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('1');

    // Redoを押す（+が戻る）
    await page.getByRole('button', { name: '↷ Redo' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('1+');

    // もう一度Redoを押す（2が戻る）
    await page.getByRole('button', { name: '↷ Redo' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('1+2');
  });

  test('シナリオ5: バックスペース機能のテスト', async ({ page }) => {
    // 456を入力
    await page.getByRole('button', { name: '4' }).click();
    await page.getByRole('button', { name: '5' }).click();
    await page.getByRole('button', { name: '6' }).click();

    // 入力が表示されていることを確認
    let result = await page.locator('#result').inputValue();
    expect(result).toBe('456');

    // バックスペースを押す（6が消える）
    await page.getByRole('button', { name: '←' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('45');

    // もう一度バックスペースを押す（5が消える）
    await page.getByRole('button', { name: '←' }).click();
    result = await page.locator('#result').inputValue();
    expect(result).toBe('4');
  });
});
