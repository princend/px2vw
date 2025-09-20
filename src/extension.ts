import * as vscode from 'vscode';

// 迴圈防護，避免 onDidChangeTextDocument 內部替換又觸發自身造成回流
let isEditing = false;

// 中間態友善的偵測正則：允許輸入過程，但只在完整 'px' 時提示
// 例： 192t160px -> designWidth=1920, px=160, tail='px'
// 修改中間態偵測正則：允許中間為 t，完整為 'px' 結尾
const DETECT_REGEX = /(\d+)t(\d+(?:\.\d+)?)(p?x?)/g;

// 僅從完整 token 轉換：必須是 'px' 結尾，並用 t 作分隔符
const FULL_TOKEN_REGEX = /(\d+)t(\d+(?:\.\d+)?)px/g;

// 單純 px 轉換（當使用者只選到 '160px' 時，使用設定中的設計寬度 px2vw.designWidth）
const SIMPLE_PX_REGEX = /(\d+(?:\.\d+)?)px/g;

function toVw(px: number, designWidth: number, decimals: number) {
  const vw = (px / designWidth) * 100;
  const fixed = vw.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '') + 'vw';
}


function convertWithInlineDesignWidth(text: string, decimals: number): string {
  return text.replace(FULL_TOKEN_REGEX, (_m, designWidthStr: string, pxStr: string) => {
    const px = parseFloat(pxStr);
    const dw = parseFloat(designWidthStr);
    return toVw(px, dw, decimals);
  });
}

function convertSimplePx(text: string, designWidth: number, decimals: number): string {
  return text.replace(SIMPLE_PX_REGEX, (_m, pxStr: string) => {
    const px = parseFloat(pxStr);
    return toVw(px, designWidth, decimals);
  });
}

// 將選區（或空選區所屬整行）統一轉換
async function convertSelectionOrLine(editor: vscode.TextEditor) {
  const cfg = vscode.workspace.getConfiguration('px2vw');
  const defaultDW = cfg.get<number>('designWidth', 1920);
  const decimals = cfg.get<number>('decimals', 3);

  const edits: { range: vscode.Range; value: string }[] = [];

  for (const sel of editor.selections) {
    const targetRange = sel.isEmpty
      ? editor.document.lineAt(sel.start.line).range
      : new vscode.Range(sel.start, sel.end);

    const raw = editor.document.getText(targetRange);

    // 先嘗試內嵌設計寬度格式（1920.160px）
    let converted = convertWithInlineDesignWidth(raw, decimals);

    // 如果沒有發生任何變化，再嘗試單純 px 以 defaultDW 轉換
    if (converted === raw) {
      converted = convertSimplePx(raw, defaultDW, decimals);
    }

    if (converted !== raw) {
      edits.push({ range: targetRange, value: converted });
    }
  }

  if (edits.length === 0) {
    vscode.window.showInformationMessage('未找到可轉換的 px 或 1920.160px 格式');
    return;
  }

  await editor.edit((builder) => {
    for (const e of edits) builder.replace(e.range, e.value);
  });
}

export function activate(context: vscode.ExtensionContext) {
  // 顯式命令：px2vw.convert
  const convertCmd = vscode.commands.registerCommand('px2vw.convert', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('請先開啟一個檔案');
      return;
    }
    await convertSelectionOrLine(editor);
  });
  context.subscriptions.push(convertCmd);

  // 輸入偵測：在完整打出 '<designWidth>.<px>px' 時提示轉換
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const cfg = vscode.workspace.getConfiguration('px2vw');
    if (!cfg.get<boolean>('enableTypingDetection', true)) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;
    if (isEditing) return;

    for (const change of event.contentChanges) {
      const line = event.document.lineAt(change.range.start.line);
      DETECT_REGEX.lastIndex = 0;

      let hasFullToken = false;
      let m: RegExpExecArray | null;
      while ((m = DETECT_REGEX.exec(line.text))) {
        // 僅在完整 'px' 結尾時提示
        if (m[3] === 'px') {
          hasFullToken = true;
          break;
        }
      }

      if (hasFullToken) {
        const pick = await vscode.window.showQuickPick(['轉換成 vw', '取消'], {
          placeHolder: '偵測到 <設計寬度>.<px>px 格式，是否要轉換為 vw？',
          ignoreFocusOut: true,
        });

        if (pick === '轉換成 vw') {
          isEditing = true;
          try {
            const decimals = cfg.get<number>('decimals', 3);
            const converted = convertWithInlineDesignWidth(line.text, decimals);
            if (converted !== line.text) {
              await editor.edit((eb) => eb.replace(line.range, converted));
            }
          } finally {
            isEditing = false;
          }
        }
        break; // 一次只提示一次
      }
    }
  });
  context.subscriptions.push(changeDisposable);

  // 保險：切換活動編輯器時也可加入日後邏輯
  const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
    // 預留：如需同步設定或重置狀態可在此處理
  });
  context.subscriptions.push(activeEditorDisposable);
}

export function deactivate() {}
