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

import * as tf from '@tensorflow/tfjs-core';
import * as PianoGenieModel from './model';
import { PianoGenieUI } from './ui';
import { ALL_CONFIGS, DEFAULT_CFG_NAME, PianoGenieConfig } from './configs';
import { LSTMState, LSTMStateUtil } from './lstm_state';
import * as Sample from './sample';
import * as Tone from 'tone';
// tslint:disable-next-line:no-require-imports
const PianoSampler = require('tone-piano').Piano;

const SALAMANDER_URL = 'https://storage.googleapis.com/download.magenta.tensorflow.org/demos/SalamanderPiano/';

class PianoGenie {
  private cfg: PianoGenieConfig;
  private sampler: any;
  private model: PianoGenieModel.Model;
  private ui: PianoGenieUI;

  private buttonToNoteMap: Map<number, number>;

  private sustainPedalDown: boolean;
  private sustainedNotes: Set<number>;

  private softPedalDown: boolean;

  private extemporeState: LSTMState;
  private extemporeLastOutput: number;
  private extemporeTime: Date;
  private extemporeNeuralCache: Sample.NeuralCache;
  private extemporeButtonCache: Sample.ButtonCache;

  private lookAheadState: LSTMState;
  private lookAheadPreds: number[];

  private initLookAhead() {
    const numButtons = this.cfg.modelCfg.getNumButtons();
    this.lookAheadState = this.model.createZeroState(numButtons);
    this.lookAheadPreds = [];
    for (let i = 0; i < numButtons; ++i) {
      this.lookAheadPreds.push(-1);
    }
  }

  private initExtempore() {
    this.extemporeState = this.model.createZeroState(1);
    this.extemporeLastOutput = -1;
    this.extemporeTime = new Date();
    this.extemporeTime.setSeconds(this.extemporeTime.getSeconds() - 100000);
    this.extemporeNeuralCache = new Sample.NeuralCache(Sample.CACHE_SIZE);
    this.extemporeButtonCache = new Sample.ButtonCache(Sample.CACHE_SIZE);
  }

  constructor(cfg: PianoGenieConfig, sampler: any, model: PianoGenieModel.Model, ui: PianoGenieUI) {
    this.cfg = cfg;
    this.model = model;
    this.sampler = sampler;
    this.ui = ui;

    this.buttonToNoteMap = new Map<number, number>();
    this.ui.genieCanvas.resize(this.cfg.modelCfg.getNumButtons());

    this.sustainPedalDown = false;
    this.sustainedNotes = new Set<number>();

    if (this.cfg.defaultUserParameters.lookAhead) {
      this.initLookAhead();
      this.lookAhead();
    } else {
      this.initExtempore();
    }

    // Bind keyboard controls
    document.onkeydown = (evt: KeyboardEvent) => {
      if (Tone.context.state !== 'running') {
        Tone.context.resume();
      }
      const key = evt.keyCode;
      let button = key - 49;
      if (button >= 0 && button < 8) {
        button = button % this.cfg.modelCfg.getNumButtons();
        if (!this.buttonToNoteMap.has(button)) {
          this.pressButton(button);
        }
      }

      if (key === 32) {
        this.sustainPedalDown = true;
      }

      if (key === 83) {
        this.softPedalDown = true;
      }
    };
    document.onkeyup = (evt: KeyboardEvent) => {
      const key = evt.keyCode;
      let button = key - 49;
      if (button >= 0 && button < 8) {
        button = button % this.cfg.modelCfg.getNumButtons();
        if (this.buttonToNoteMap.has(button)) {
          this.releaseButton(button);
        }
      }

      if (key === 32) {
        this.sustainPedalDown = false;
        const heldButtonNotes = new Set<number>(this.buttonToNoteMap.values());
        this.sustainedNotes.forEach((note: number) => {
          if (!heldButtonNotes.has(note)) {
            this.sampler.keyUp(note);
          }
        });
        this.sustainedNotes.clear();
      }

      if (key === 83) {
        this.softPedalDown = false;
      }
    };

    // Bind reset button
    this.ui.resetBtn.onclick = () => {
      this.buttonToNoteMap = new Map<number, number>();
      this.redrawPiano();

      if (this.cfg.defaultUserParameters.lookAhead) {
        LSTMStateUtil.dispose(this.lookAheadState);
        this.initLookAhead();
        this.lookAhead();
      } else {
        LSTMStateUtil.dispose(this.extemporeState);
        this.initExtempore();
      }
    };

    // Bind model selector
    this.ui.cfgSelect.onchange = () => {
      const value = this.ui.cfgSelect.options[this.ui.cfgSelect.selectedIndex].value;
      this.changeModel(ALL_CONFIGS[value]);
    };
  }

  private pressButton(button: number) {
    if (this.cfg.defaultUserParameters.lookAhead) {
      // Get precomputed answer
      const output = this.lookAheadPreds[button];
      this.lookAheadPreds = [];

      // Play immediately
      const note = output + 21;
      if (this.sustainPedalDown) {
        if (this.sustainedNotes.has(note)) {
          this.sampler.keyUp(note);
        }
        this.sustainedNotes.add(note);
      }
      this.sampler.keyDown(note, undefined, this.softPedalDown ? 0.2 : 0.8);

      // Draw immediately
      this.buttonToNoteMap.set(button, note);
      this.ui.genieCanvas.redraw(this.buttonToNoteMap);
      this.redrawPiano();

      // Look ahead
      this.lookAhead(button, output);
    } else {
      // Compute answer
      const time = new Date();
      const deltaTimeSeconds = (time.getTime() - this.extemporeTime.getTime()) / 1000;
      const [newState, logits] = this.model.evaluate(
        this.extemporeState,
        [button],
        [this.extemporeLastOutput],
        [deltaTimeSeconds]);

      const userParameters = this.ui.getUserParameters();
      const newStateRepresentative = LSTMStateUtil.getRepresentative(newState);
      let preds: tf.Tensor1D;
      switch (userParameters.samplingType) {
        case Sample.SamplingType.Greedy:
          preds = Sample.sampleGreedy(logits);
          break;
        case Sample.SamplingType.Categorical:
          preds = Sample.sampleCategorical(
            logits,
            userParameters.categoricalTemperature);
          break;
        case Sample.SamplingType.ButtonUnigram:
          preds = Sample.sampleButtonUnigram(
            logits,
            this.extemporeButtonCache,
            button,
            userParameters.categoricalTemperature,
            userParameters.cacheLambda);
          break;
        case Sample.SamplingType.NeuralCache:
          preds = Sample.sampleNeuralCache(
            logits,
            this.extemporeNeuralCache,
            newStateRepresentative,
            userParameters.categoricalTemperature,
            userParameters.cacheLambda,
            userParameters.neuralCacheTheta);
          break;
        default:
          throw new Error();
      }

      const predsArr = preds.dataSync() as Int32Array;

      // Play
      const output = predsArr[0];
      const note = output + 21;
      if (this.sustainPedalDown) {
        if (this.sustainedNotes.has(note)) {
          this.sampler.keyUp(note);
        }
        this.sustainedNotes.add(note);
      }
      this.sampler.keyDown(note, undefined, this.softPedalDown ? 0.2 : 0.8);

      // Draw
      this.buttonToNoteMap.set(button, note);
      this.ui.genieCanvas.redraw(this.buttonToNoteMap);
      this.redrawPiano();

      this.extemporeNeuralCache.push([tf.clone(newStateRepresentative), predsArr]);
      this.extemporeButtonCache.push([button, output]);

      LSTMStateUtil.dispose(this.extemporeState);
      this.extemporeState = newState;
      this.extemporeLastOutput = output;
      this.extemporeTime = time;
      logits.dispose();
      preds.dispose();
    }
  }

  private releaseButton(button: number) {
    const note = this.buttonToNoteMap.get(button);
    if (!this.sustainPedalDown) {
      this.sampler.keyUp(note);
    }
    this.buttonToNoteMap.delete(button);

    this.ui.genieCanvas.redraw(this.buttonToNoteMap);
    this.redrawPiano();
  }

  private redrawPiano() {
    const noteToHueLightnessMap = new Map<number, [number, number]>();
    const numButtons = this.cfg.modelCfg.getNumButtons();

    for (let i = 0; i < numButtons; ++i) {
      const hue = this.ui.genieCanvas.getHue(i);

      // Add (bright) predicted buttons
      if (this.cfg.defaultUserParameters.lookAhead && this.lookAheadPreds !== undefined && this.lookAheadPreds.length === numButtons) {
        noteToHueLightnessMap.set(this.lookAheadPreds[i] + 21, [hue, 75]);
      }

      // Add (dark) held button
      const heldNote = this.buttonToNoteMap.get(i);
      if (heldNote) {
        noteToHueLightnessMap.set(heldNote, [hue, 50]);
      }
    }

    this.ui.pianoCanvas.redraw(noteToHueLightnessMap);
  }

  private lookAhead(currButton?: number, currOutput?: number) {
    let copiedState: LSTMState;
    if (currButton === undefined) {
      if (this.lookAheadPreds[0] !== -1) {
        throw Error('');
      }
      copiedState = this.lookAheadState;
      currOutput = -1;
    } else {
      // Copy state of selected to batch
      copiedState = LSTMStateUtil.copyItemToBatch(this.lookAheadState, currButton);
      LSTMStateUtil.dispose(this.lookAheadState);
    }

    // Create batch
    const numButtons = this.cfg.modelCfg.getNumButtons();
    const allButtons = [];
    const currOutputs = [];
    for (let i = 0; i < numButtons; ++i) {
      allButtons.push(i);
      currOutputs.push(currOutput);
    }
    const [newState, logits] = this.model.evaluate(
      copiedState,
      allButtons,
      currOutputs,
      undefined);
    const preds = this.cfg.defaultUserParameters.samplingType === Sample.SamplingType.Greedy ? Sample.sampleGreedy(logits) : Sample.sampleCategorical(logits);

    // Retrieve predictions
    const predsArr = preds.dataSync();
    this.lookAheadPreds = [];
    for (let i = 0; i < numButtons; ++i) {
      const pred = predsArr[i];
      this.lookAheadPreds.push(pred);
    }
    this.lookAheadState = newState;

    // Redraw UI with predicted notes
    this.redrawPiano();

    // Clean up tensors
    LSTMStateUtil.dispose(copiedState);
    logits.dispose();
    preds.dispose();
  }

  private changeModel(newCfg: PianoGenieConfig) {
    const newModel = new PianoGenieModel.Model(newCfg.modelCfg);
    this.ui.setLoading();

    newModel.initialize(newCfg.uri).then(() => {
      const oldCfg = this.cfg;

      if (oldCfg.defaultUserParameters.lookAhead) {
        LSTMStateUtil.dispose(this.lookAheadState);
      } else {
        LSTMStateUtil.dispose(this.extemporeState);
        this.extemporeNeuralCache.dispose();
      }
      this.model.dispose();

      this.model = newModel;
      this.cfg = newCfg;

      this.buttonToNoteMap = new Map<number, number>();
      this.ui.genieCanvas.resize(this.cfg.modelCfg.getNumButtons());
      this.redrawPiano();

      if (this.cfg.defaultUserParameters.lookAhead) {
        this.initLookAhead();
        this.lookAhead();
      } else {
        this.initExtempore();
      }

      this.ui.setUserParameters(this.cfg.defaultUserParameters);
      this.ui.setReady();
    });
  }
}

const ui = new PianoGenieUI();
const div = document.getElementById('piano-genie-ui');
div.appendChild(ui.div);

const defaultCfg = ALL_CONFIGS[DEFAULT_CFG_NAME];
const defaultModel = new PianoGenieModel.Model(defaultCfg.modelCfg);
ui.genieCanvas.resize(defaultCfg.modelCfg.getNumButtons());
ui.setUserParameters(defaultCfg.defaultUserParameters);

const sampler = new PianoSampler({ velocities: 4 }).toMaster();

Promise.all([
  sampler.load(SALAMANDER_URL),
  defaultModel.initialize(defaultCfg.uri)])
  .then(() => {
    new PianoGenie(defaultCfg, sampler, defaultModel, ui);
    ui.setReady();
  });
