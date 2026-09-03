/**
 * The slice of opentype.js the hand actually uses. Shipping this instead of `@types/opentype.js`
 * keeps the dependency list at one package and keeps the surface we depend on visible and small.
 */
declare module 'opentype.js' {
  export interface PathCommand {
    type: 'M' | 'L' | 'C' | 'Q' | 'Z';
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  export interface Path {
    commands: PathCommand[];
    toPathData(decimals?: number): string;
  }
  export interface Glyph {
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    charToGlyph(ch: string): Glyph;
  }
  export function parse(buffer: ArrayBuffer): Font;
  const opentype: { parse: typeof parse };
  export default opentype;
}
