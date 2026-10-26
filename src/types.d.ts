// The engine's lite decoder ships as plain JavaScript; these are the parts this app uses.
declare module "@quran.ws/engine/lite" {
  export interface QvpWord { index: number; surah: number; ayah: number; word: number; text: string; lineIndex: number; box: [number, number, number, number] }
  interface DrawOptions { scale?: number; x?: number; y?: number; ink?: string }
  export class QvpLitePage {
    width: number;
    height: number;
    number: number;
    words: QvpWord[];
    fit(canvas: HTMLCanvasElement, padding?: number): { scale: number; x: number; y: number };
    draw(ctx: CanvasRenderingContext2D, o?: DrawOptions & { highlight?: number[]; band?: string }): void;
    drawWords(ctx: CanvasRenderingContext2D, words: number[], o?: DrawOptions): void;
    drawDecorations(ctx: CanvasRenderingContext2D, o?: DrawOptions): void;
    hitTest(x: number, y: number): QvpWord | null;
  }
  export function loadPage(url: string, init?: RequestInit): Promise<QvpLitePage>;
}
