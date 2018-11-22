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
import { LSTMState, LSTMStateUtil } from './lstm_state';

export class ModelCfg {
  DATA_MAX_DISCRETE_TIMES = 32

  RNN_CELLTYPE = 'lstm';
  RNN_NLAYERS = 2;
  RNN_NUNITS = 128;
  RNN_SINGLELAYER_LEGACY = false;
  RNN_UNFUSED_LEGACY = true;

  STP_EMB_VQ = false;
  STP_EMB_VQ_CODEBOOK_SIZE = 8;

  STP_EMB_IQ = false;
  STP_EMB_IQ_NBINS = 8;

  DEC_AUTOREGRESSIVE = false;
  DEC_AUX_FEATS_DELTA_TIMES_INT = false;

  getNumButtons() {
    let numButtons = 0;
    if (this.STP_EMB_VQ) {
      numButtons += this.STP_EMB_VQ_CODEBOOK_SIZE;
    }
    if (this.STP_EMB_IQ) {
      numButtons += this.STP_EMB_IQ_NBINS;
    }

    if (numButtons === 0 && this.DEC_AUTOREGRESSIVE) {
      numButtons += 1;
    }

    return numButtons;
  }

  getUsesDeltaTime() {
    return this.DEC_AUX_FEATS_DELTA_TIMES_INT;
  }
}

export class StpVqLegacyCfg extends ModelCfg {
  constructor() {
    super();
    this.RNN_SINGLELAYER_LEGACY = true;
    this.STP_EMB_VQ = true;
  }
}

export class AutoNoEncCfg extends ModelCfg {
  constructor(fused?: boolean, rnnDims?: [number, number]) {
    super();
    this.DEC_AUTOREGRESSIVE = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}

export class AutoNoEncDtCfg extends ModelCfg {
  constructor(fused?: boolean, rnnDims?: [number, number]) {
    super();
    this.DEC_AUTOREGRESSIVE = true;
    this.DEC_AUX_FEATS_DELTA_TIMES_INT = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}

export class StpVqCfg extends ModelCfg {
  constructor() {
    super();
    this.STP_EMB_VQ = true;
  }
}

export class StpVqAutoCfg extends ModelCfg {
  constructor(fused?: boolean, rnnDims?: [number, number]) {
    super();
    this.STP_EMB_VQ = true;
    this.DEC_AUTOREGRESSIVE = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}

export class StpVqAutoDtCfg extends ModelCfg {
  constructor(fused?: boolean, rnnDims?: [number, number]) {
    super();
    this.STP_EMB_VQ = true;
    this.DEC_AUTOREGRESSIVE = true;
    this.DEC_AUX_FEATS_DELTA_TIMES_INT = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}

export class StpIqCfg extends ModelCfg {
  constructor() {
    super();
    this.STP_EMB_IQ = true;
  }
}

export class StpIqAutoCfg extends ModelCfg {
  constructor(fused?: boolean, numBins?: number, rnnDims?: [number, number]) {
    super();
    this.STP_EMB_IQ = true;
    this.DEC_AUTOREGRESSIVE = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (numBins) {
      this.STP_EMB_IQ_NBINS = numBins;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}

export class StpIqAutoDtCfg extends ModelCfg {
  constructor(fused?: boolean, numBins?: number, rnnDims?: [number, number]) {
    super();
    this.STP_EMB_IQ = true;
    this.DEC_AUTOREGRESSIVE = true;
    this.DEC_AUX_FEATS_DELTA_TIMES_INT = true;
    if (fused) {
      this.RNN_UNFUSED_LEGACY = false;
    }
    if (numBins) {
      this.STP_EMB_IQ_NBINS = numBins;
    }
    if (rnnDims) {
      this.RNN_NLAYERS = rnnDims[0];
      this.RNN_NUNITS = rnnDims[1];
    }
  }
}


export class Model {
  private cfg: ModelCfg;
  private initialized: boolean;

  // Model state
  private modelVars: { [varName: string]: tf.Tensor };
  private decLSTMCells: tf.LSTMCellFunc[];
  private decForgetBias: tf.Scalar;

  constructor(cfg: ModelCfg) {
    this.cfg = cfg;
    this.initialized = false;
  }

  async initialize(ckptDirURI?: string, staticVars?: tf.NamedTensorMap) {
    if (this.initialized) {
      this.dispose();
    }

    if (ckptDirURI === undefined && staticVars === undefined) {
      throw new Error('Need to specify either URI or static variables');
    }

    // TODO: regex for ignore variables

    if (staticVars === undefined) {
      const vars = await fetch(`${ckptDirURI}/weights_manifest.json`)
        .then((response) => response.json())
        .then(
          (manifest: tf.io.WeightsManifestConfig) =>
            tf.io.loadWeights(manifest, ckptDirURI));
      this.modelVars = vars;
      console.log(vars);
    } else {
      this.modelVars = staticVars;
    }

    this.decLSTMCells = [];
    this.decForgetBias = tf.scalar(1, 'float32');
    for (let i = 0; i < this.cfg.RNN_NLAYERS; ++i) {
      let cellFuseSpec: string;
      if (this.cfg.RNN_UNFUSED_LEGACY) {
        cellFuseSpec = 'basic_lstm_cell';
      } else {
        cellFuseSpec = 'lstm_cell';
      }

      let cellPrefix: string;
      if (this.cfg.RNN_SINGLELAYER_LEGACY) {
        cellPrefix = `phero_model/decoder/rnn/rnn/multi_rnn_cell/cell_0/${cellFuseSpec}/`;
      } else {
        cellPrefix = `phero_model/decoder/rnn/rnn/multi_rnn_cell/cell_${i}/${cellFuseSpec}/`;
      }

      this.decLSTMCells.push((data: tf.Tensor2D, c: tf.Tensor2D, h: tf.Tensor2D) =>
        tf.basicLSTMCell(
          this.decForgetBias,
          this.modelVars[cellPrefix + 'kernel'] as tf.Tensor2D,
          this.modelVars[cellPrefix + 'bias'] as tf.Tensor1D,
          data, c, h
        ));
    }

    this.initialized = true;

    // Run the network once to avoid long malloc on first button press.
    tf.tidy(() => {
      const coldStartLastState = this.createZeroState(1);
      this.evaluate(coldStartLastState, [0], [-1], [0.]);
    });
  }

  evaluate(
    state: LSTMState,
    buttons: number[],
    lastOutput: number[],
    deltaTimesSeconds: number[]) {
    if (!this.initialized) {
      throw new Error('Model not initialized');
    }

    if (buttons.length !== state.c[0].shape[0]) {
      throw new Error('Shapes of state and buttons do not agree');
    }

    const [finalState, decLogits]: [LSTMState, tf.Tensor2D] = tf.tidy(() => {
      // Build decoder feats array
      const decFeatsArr: tf.Tensor2D[] = [];

      if (this.cfg.STP_EMB_VQ) {
        const buttonTensor = tf.tensor1d(buttons, 'int32');
        const buttonOh = tf.cast(tf.oneHot(buttonTensor, this.cfg.STP_EMB_VQ_CODEBOOK_SIZE), 'float32');
        decFeatsArr.push(
          tf.matMul(buttonOh,
            this.modelVars['phero_model/stp_emb_vq/quantizer/vq_layer/embedding'] as tf.Tensor2D,
            undefined, true));
      }

      if (this.cfg.STP_EMB_IQ) {
        const buttonTensor = tf.tensor2d(buttons, [buttons.length, 1], 'float32');
        const buttonScaled = tf.sub(tf.mul(2., tf.div(buttonTensor, this.cfg.STP_EMB_IQ_NBINS - 1)), 1)
        decFeatsArr.push(buttonScaled as tf.Tensor2D);
      }

      if (this.cfg.DEC_AUTOREGRESSIVE) {
        const lastOutputTensor = tf.tensor1d(lastOutput, 'int32');
        const lastOutputInc = tf.add(lastOutputTensor, tf.scalar(1, 'int32')) as tf.Tensor1D;
        const lastOutputOh = tf.cast(tf.oneHot(lastOutputInc, 89), 'float32');
        decFeatsArr.push(lastOutputOh);
      }

      if (this.cfg.DEC_AUX_FEATS_DELTA_TIMES_INT) {
        const deltaTimesSecondsTensor = tf.tensor1d(deltaTimesSeconds, 'float32');
        const deltaTimesNearestBinTensor = tf.round(tf.mul(deltaTimesSecondsTensor, 31.25));
        const deltaTimesRateTrunc = tf.minimum(deltaTimesNearestBinTensor, this.cfg.DATA_MAX_DISCRETE_TIMES);
        const deltaTimesInt = tf.cast(tf.add(deltaTimesRateTrunc, 1e-4), 'int32') as tf.Tensor1D;
        const deltaTimesIntOh = tf.cast(tf.oneHot(deltaTimesInt, this.cfg.DATA_MAX_DISCRETE_TIMES + 1), 'float32');
        decFeatsArr.push(deltaTimesIntOh);
      }

      // Project feats array through RNN input matrix
      let rnnInput: tf.Tensor2D = tf.concat(decFeatsArr, 1);
      rnnInput = tf.matMul(
        rnnInput,
        this.modelVars['phero_model/decoder/rnn_input/dense/kernel'] as tf.Tensor2D);
      rnnInput = tf.add(
        rnnInput,
        this.modelVars['phero_model/decoder/rnn_input/dense/bias'] as tf.Tensor1D);

      // Evaluate RNN
      const [c, h] = tf.multiRNNCell(this.decLSTMCells, rnnInput, state.c, state.h);
      const finalState: LSTMState = { c: c, h: h };

      // Project to scores
      let decLogits: tf.Tensor2D = tf.matMul(
        h[this.cfg.RNN_NLAYERS - 1],
        this.modelVars['phero_model/decoder/pitches/dense/kernel'] as tf.Tensor2D);
      decLogits = tf.add(
        decLogits,
        this.modelVars['phero_model/decoder/pitches/dense/bias'] as tf.Tensor1D);

      return [finalState, decLogits] as [LSTMState, tf.Tensor2D];
    });

    return [finalState, decLogits] as [LSTMState, tf.Tensor2D];
  }

  createZeroState(batchSize: number) {
    return LSTMStateUtil.createZero(batchSize, this.cfg.RNN_NLAYERS, this.cfg.RNN_NUNITS);
  }

  dispose() {
    Object.keys(this.modelVars).forEach(name => this.modelVars[name].dispose());
    this.decForgetBias.dispose();
    this.initialized = false;
  }
}
