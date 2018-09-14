/* Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

export class ButtonCanvas {
  private canvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  private nbuttons: number;
  private hues: number[];

  constructor(div: HTMLElement, nbuttons = 8, height = 110, width = 450) {
    const genieDiv = document.createElement('div');
    this.canvas = document.createElement('canvas');
    genieDiv.appendChild(this.canvas);
    div.appendChild(genieDiv);

    this.canvasCtx = this.canvas.getContext('2d');

    this.resize(nbuttons, height, width);
    this.redraw(null);
  }

  resize(nbuttons: number, height = 110, width = 450) {
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
