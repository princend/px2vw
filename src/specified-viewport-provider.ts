import * as vscode from 'vscode'
import Provider from './provider';
import SpecifiedViewPortProcess from './specified-viewport-process';

export default class SpecifiedViewPortProvider extends Provider implements vscode.CompletionItemProvider {
    constructor(public process: SpecifiedViewPortProcess) { super(process); }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        return new Promise((resolve, reject) => {
            // 取得游標所在 px token
            const wordRange = document.getWordRangeAtPosition(position, /([-]?\d+(?:\.\d+)?)t(\d+(?:\.\d+)?)px/);
            if (!wordRange) return resolve([]);
            const word = document.getText(wordRange);
            const res = this.process.convert(word);
            console.log('provideCompletionItems', word, res);
            if (!res) {
                return resolve([]);
            }
            const item = new vscode.CompletionItem(`${res.pxValue}px -> ${res.vw}`, vscode.CompletionItemKind.Snippet);
            item.insertText = res.vw;
            item.range = wordRange;
            return resolve([item]);
        });
    }
}