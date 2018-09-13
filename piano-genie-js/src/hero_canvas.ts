export class HeroCanvas {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  private nbuttons: number;
  private hues: number[];

  constructor(div: HTMLElement, nbuttons = 8, height = 100, width = 400) {
    const heroDiv = document.createElement('div');
    this.canvas = document.createElement('canvas');
    heroDiv.appendChild(this.canvas);
    div.appendChild(heroDiv);

    this.canvasCtx = this.canvas.getContext('2d');

    this.resize(nbuttons, height, width);
    this.redraw(null);
  }

  resize(nbuttons: number, height = 100, width = 400) {
    this.nbuttons = nbuttons;
    this.canvas.height = height;
    this.canvas.width = width;

    this.hues = [];
    for (let i = 0; i < nbuttons; ++i) {
      this.hues.push((i / nbuttons) * 360);
    }
    this.redraw();
  }

  getHue(button: number) {
    return this.hues[button];
  }

  private relToAbs(x: number) {
    return (x / this.nbuttons) * this.canvas.width;
  }

  redraw(buttonToNoteMap?: Map<number, number>) {
    const ctx = this.canvasCtx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.nbuttons; ++i) {
      const lightness = (buttonToNoteMap && buttonToNoteMap.has(i)) ? '15%' : '50%';
      ctx.fillStyle = 'hsl(' + this.hues[i] + ',80%,' + lightness + ')';
      const l = this.relToAbs(i);
      const r = this.relToAbs(i + 1);
      const w = r - l;
      ctx.fillRect(l, 0, w, height);
    }
  }
}
