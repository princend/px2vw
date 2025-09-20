import Process from "./process";

export default class SpecifiedViewPortProcess extends Process {
    protected regPx: RegExp = /([-]?[\d.]+)t([\d.]+)p(x)?/;
    protected regPxAll: RegExp = /([-]?[\d.]+)t([\d.]+)px/g;    
    constructor(public config: any) { super(config); }


    convert(text: string) {

        console.log('123456',text);
        
        const match = text.match(this.regPx)
        if (!match) return '';
        console.log('123456 ismatch');
        
        // match[1]: viewport, match[2]: pxvalue
        let viewport = match[1];
        if (!viewport) return '';
        let pxvalue = match[2];
        if (!pxvalue) return '';
        console.log('ready to convert',viewport,pxvalue);
        
        const res = this.px2vw(viewport, pxvalue);
        console.log('converted',res);
        
        return {
            px: pxvalue,
            pxValue: parseFloat(pxvalue),
            vw: res.vw,
            viewport: res.viewport
        };
    }

    convertAll(text: string): string {

        console.log('789');
        if (!text) return text;
        return text.replace(this.regPxAll, (_word: string, viewport: string, pxvalue: string) => {
            const res = this.px2vw(viewport, pxvalue);
            if (res) return res.vw;
            return _word;
        });
    }

    protected px2vw(viewport: string, pxvalue: string) {
        const dw = parseFloat(viewport);
        const px = parseFloat(pxvalue);
        const decimals = this.config.decimals ?? 3;
        let vw: string = +(px / dw * 100).toFixed(decimals) + 'vw';
        return {
            px: pxvalue,
            pxValue: px,
            vw: vw,
            viewport: dw
        };
    }
} 