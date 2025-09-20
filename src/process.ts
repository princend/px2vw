export default class Process {
    constructor(public config: any) { }
    protected regPx: RegExp = /([-]?[\d.]+)p(x)?/;
    protected regPxAll: RegExp = /([-]?[\d.]+)px/g;

    convert(text: string) {
        let match = text.match(this.regPx)
        if (!match) return '';
        return this.px2vw(match[1]);
    }

    convertAll(text: string): string {
        if (!text) return text;
        return text.replace(this.regPxAll, (word: string) => {
            const res = this.px2vw(word);
            if (res) return res.vw;
            return word;
        });
    }

    protected px2vw(text: string, ..._params:any[]) {
        const pxValue = parseFloat(text);

        let vw: string = +(pxValue / this.config.designWidth * 100).toFixed(this.config.decimals) + 'vw';
        return {
            px: text,
            pxValue: pxValue,
            vw: vw
        }
    }
}