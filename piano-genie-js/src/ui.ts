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

import { ButtonCanvas } from './button_canvas';
import { PianoCanvas } from './piano_canvas';
import { SamplingType} from './sample';
import { PianoGenieUserParameters, ALL_CONFIGS, DEFAULT_CFG_NAME } from './configs';

const SLIDER_MAX_VALUE = 10000;

export class PianoGenieUI {
  readonly div: HTMLDivElement;
  private loadingDiv: HTMLDivElement;
  private contentDiv: HTMLDivElement;
  readonly cfgSelect: HTMLSelectElement;
  readonly lookAheadCheckBox: HTMLInputElement;
  private samplingTypeRadio: HTMLInputElement[];
  private categoricalTemperatureSlider: HTMLInputElement;
  private neuralCacheThetaSlider: HTMLInputElement;
  private cacheLambdaSlider: HTMLInputElement;
  readonly resetBtn: HTMLButtonElement;
  readonly genieCanvas: ButtonCanvas;
  readonly pianoCanvas: PianoCanvas;

  constructor() {
    this.div = document.createElement('div');

    // Create loading div
    this.loadingDiv = document.createElement('div');
    this.loadingDiv.appendChild(document.createTextNode('Loading...'));

    // Create content div
    this.contentDiv = document.createElement('div');

    // Create model selector
    const modelDiv = document.createElement('div');
    modelDiv.appendChild(document.createTextNode('Model'));
    this.cfgSelect = document.createElement('select');
    const cfg_keys = Object.keys(ALL_CONFIGS);
    for (let i = 0; i < cfg_keys.length; ++i) {
      const opt = document.createElement('option');
      opt.innerHTML = ALL_CONFIGS[cfg_keys[i]].name;
      opt.value = cfg_keys[i];
      if (opt.value === DEFAULT_CFG_NAME) {
        opt.selected = true;
      }
      this.cfgSelect.appendChild(opt);
    }
    modelDiv.appendChild(this.cfgSelect);

    // Create reset button
    this.resetBtn = document.createElement('button');
    this.resetBtn.appendChild(document.createTextNode('Reset'));
    modelDiv.appendChild(this.resetBtn);
    this.contentDiv.appendChild(modelDiv);

    // Create look ahead check box
    const lookAheadCheckBoxDiv = document.createElement('div');
    this.lookAheadCheckBox = document.createElement('input');
    this.lookAheadCheckBox.setAttribute('type', 'checkbox');
    lookAheadCheckBoxDiv.appendChild(this.lookAheadCheckBox);
    // TODO(chrisdonahue): Re-enable this later
    //this.contentDiv.appendChild(lookAheadCheckBoxDiv);

    // Create sampling type radio button
    const samplingTypeRadioDiv = document.createElement('div');
    this.samplingTypeRadio = [];
    samplingTypeRadioDiv.appendChild(document.createTextNode('Sampling   '));
    for (let i = SamplingType.Greedy; i <= SamplingType.NeuralCache; ++i) {
      const radioButton = document.createElement('input');
      radioButton.setAttribute('type', 'radio');
      radioButton.setAttribute('name', 'samplingType');
      radioButton.setAttribute('value', String(i));
      switch (i) {
        case SamplingType.Greedy:
          samplingTypeRadioDiv.appendChild(document.createTextNode('Greedy'));
          break;
        case SamplingType.Categorical:
          samplingTypeRadioDiv.appendChild(document.createTextNode('Categorical'));
          break;
        case SamplingType.ButtonUnigram:
          samplingTypeRadioDiv.appendChild(document.createTextNode('Button Unigram'));
          break;
        case SamplingType.NeuralCache:
          samplingTypeRadioDiv.appendChild(document.createTextNode('Neural Cache'));
          break;
      }
      samplingTypeRadioDiv.appendChild(radioButton);
      this.samplingTypeRadio.push(radioButton);
    }
    // TODO(chrisdonahue): Re-enable this later
    //this.contentDiv.appendChild(samplingTypeRadioDiv);

    // Create temperature slider
    const categoricalTemperatureSliderDiv = document.createElement('div');
    this.categoricalTemperatureSlider = document.createElement('input');
    this.categoricalTemperatureSlider.setAttribute('type', 'range');
    this.categoricalTemperatureSlider.setAttribute('style', 'width:250px');
    this.categoricalTemperatureSlider.setAttribute('min', String(0));
    this.categoricalTemperatureSlider.setAttribute('max', String(SLIDER_MAX_VALUE));
    //this.categoricalTemperatureSlider.setAttribute('value', String(SLIDER_MAX_VALUE));
    categoricalTemperatureSliderDiv.appendChild(document.createTextNode('Temperature'));
    categoricalTemperatureSliderDiv.appendChild(this.categoricalTemperatureSlider);
    this.contentDiv.appendChild(categoricalTemperatureSliderDiv);

    // Create neural cache temperature slider
    const neuralCacheThetaSliderDiv = document.createElement('div');
    this.neuralCacheThetaSlider = document.createElement('input');
    this.neuralCacheThetaSlider.setAttribute('type', 'range');
    this.neuralCacheThetaSlider.setAttribute('min', String(0));
    this.neuralCacheThetaSlider.setAttribute('max', String(SLIDER_MAX_VALUE));
    //this.neuralCacheThetaSlider.setAttribute('value', String(0));
    neuralCacheThetaSliderDiv.appendChild(document.createTextNode('Theta'));
    neuralCacheThetaSliderDiv.appendChild(this.neuralCacheThetaSlider);
    // TODO(chrisdonahue): Re-enable this later
    //this.contentDiv.appendChild(neuralCacheThetaSliderDiv);

    // Create cache lambda slider
    const cacheLambdaSliderDiv = document.createElement('div');
    this.cacheLambdaSlider = document.createElement('input');
    this.cacheLambdaSlider.setAttribute('type', 'range');
    this.cacheLambdaSlider.setAttribute('min', String(0));
    this.cacheLambdaSlider.setAttribute('max', String(SLIDER_MAX_VALUE));
    //this.cacheLambdaSlider.setAttribute('value', String(0));
    cacheLambdaSliderDiv.appendChild(document.createTextNode('Lambda'));
    cacheLambdaSliderDiv.appendChild(this.cacheLambdaSlider);
    // TODO(chrisdonahue): Re-enable this later
    //this.contentDiv.appendChild(cacheLambdaSliderDiv);

    // Create button/piano interfaces
    this.genieCanvas = new ButtonCanvas(this.contentDiv);
    this.pianoCanvas = new PianoCanvas(this.contentDiv);

    // Add loading/content divs to master
    this.contentDiv.style.display = 'none';
    this.div.appendChild(this.loadingDiv);
    this.div.appendChild(this.contentDiv);
  }

  setUserParameters(params: PianoGenieUserParameters) {
    // Set lookAhead
    this.lookAheadCheckBox.checked = params.lookAhead;

    // Set samplingType
    if (params.samplingType !== undefined) {
      for (let i = SamplingType.Greedy; i <= SamplingType.NeuralCache; ++i) {
        this.samplingTypeRadio[i].checked = params.samplingType === i;
      }
    }

    // Set categoricalTemperature
    this.categoricalTemperatureSlider.value = String(params.categoricalTemperature * SLIDER_MAX_VALUE);

    // Set neuralCacheTheta
    this.neuralCacheThetaSlider.value = String(params.neuralCacheTheta * SLIDER_MAX_VALUE);

    // Set cacheLambda
    this.cacheLambdaSlider.value = String(params.cacheLambda * SLIDER_MAX_VALUE);
  }

  getUserParameters() {
    // Get lookAhead
    const lookAhead = this.lookAheadCheckBox.checked;

    // Get samplingType
    let samplingType: SamplingType;
    for (let i = SamplingType.Greedy; i <= SamplingType.NeuralCache; ++i) {
      if (this.samplingTypeRadio[i].checked) {
        samplingType = i;
        break;
      }
    }

    // Get categoricalTemperature
    const categoricalTemperature = Number(this.categoricalTemperatureSlider.value) / SLIDER_MAX_VALUE;

    // Get neuralCacheTheta
    const neuralCacheTheta = Number(this.neuralCacheThetaSlider.value) / SLIDER_MAX_VALUE;

    // Get cacheLambda
    const cacheLambda = Number(this.cacheLambdaSlider.value) / SLIDER_MAX_VALUE;

    return {
      lookAhead: lookAhead,
      samplingType: samplingType,
      categoricalTemperature: categoricalTemperature,
      neuralCacheTheta: neuralCacheTheta,
      cacheLambda: cacheLambda
    } as PianoGenieUserParameters;
  }

  setLoading() {
    this.loadingDiv.style.display = 'block';
    this.contentDiv.style.display = 'none';
  }

  setReady() {
    this.loadingDiv.style.display = 'none';
    this.contentDiv.style.display = 'block';
  }
}
