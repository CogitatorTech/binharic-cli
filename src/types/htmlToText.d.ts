declare module "html-to-text" {
    export function convert(html: string, options?: any): string;
    export function compile(options?: any): (html: string) => string;
}
