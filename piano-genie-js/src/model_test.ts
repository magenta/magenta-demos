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
import { LSTMStateUtil } from './lstm_state';
import * as Sample from './sample';
import * as test from 'tape';
import * as fs from 'fs';

function loadJSONModelWeights(fp: string) {
  const rawVars = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const vars: tf.NamedTensorMap = {};
  Object.keys(rawVars).forEach(key => {
    rawVars[key].length = rawVars[key].size;
    vars[key] = tf.tensor(Float32Array.from(rawVars[key]), rawVars[key].shape, 'float32');
  });
  return vars;
}

const EPS = 1e-6;

test('StpVqLegacy Config Correctness', async (t: test.Test) => {
  const batchSize = 1;
  const modelWeightsFp = 'testdata/stp_vq_legacy.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpVqLegacyCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const preds = tf.tidy(() => {
    const preds = [];
    for (let i = 0; i < 8; ++i) {
      [state, logits] = model.evaluate(state, [i], undefined, undefined);
      preds.push(Sample.sampleGreedy(logits));
    }
    return preds;
  });

  t.equal(preds[0].dataSync()[0], 63 - 21);
  t.equal(preds[1].dataSync()[0], 65 - 21);
  t.equal(preds[2].dataSync()[0], 61 - 21);
  t.equal(preds[3].dataSync()[0], 46 - 21);
  t.equal(preds[4].dataSync()[0], 53 - 21);
  t.equal(preds[5].dataSync()[0], 57 - 21);
  t.equal(preds[6].dataSync()[0], 49 - 21);
  t.equal(preds[7].dataSync()[0], 70 - 21);

  LSTMStateUtil.dispose(state);

  for (let i = 0; i < 8; ++i) {
    preds[i].dispose();
  }

  t.end();
});

test('AutoNoEnc Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/auto_no_enc.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.AutoNoEncCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], [-1, -1], undefined);
    [state, logits] = model.evaluate(state, [1, 2], [43, 44], undefined);
    [state, logits] = model.evaluate(state, [2, 3], [45, 46], undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[10] - 0.000627971) < EPS);
  t.ok(Math.abs(_itemZeroScores[48] - 0.0839538) < EPS);
  t.ok(Math.abs(_itemZeroScores[70] - 0.00186103) < EPS);
  t.ok(Math.abs(_itemOneScores[10] - 0.00202146) < EPS);
  t.ok(Math.abs(_itemOneScores[44] - 0.0939772) < EPS);
  t.ok(Math.abs(_itemOneScores[70] - 0.00066022) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpVq Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_vq.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpVqCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], undefined, undefined);
    [state, logits] = model.evaluate(state, [1, 2], undefined, undefined);
    [state, logits] = model.evaluate(state, [2, 3], undefined, undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[0] - 0.00001014) < EPS);
  t.ok(Math.abs(_itemZeroScores[43] - 0.47814956) < EPS);
  t.ok(Math.abs(_itemZeroScores[87] - 0.00000051) < EPS);
  t.ok(Math.abs(_itemOneScores[0] - 0.00003968) < EPS);
  t.ok(Math.abs(_itemOneScores[44] - 0.4716908) < EPS);
  t.ok(Math.abs(_itemOneScores[87] - 0.00000909) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpVqAuto Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_vq_auto.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpVqAutoCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], [-1, -1], undefined);
    [state, logits] = model.evaluate(state, [1, 2], [43, 44], undefined);
    [state, logits] = model.evaluate(state, [2, 3], [45, 46], undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[0] - 0.00000113) < EPS);
  t.ok(Math.abs(_itemZeroScores[54] - 0.10691249) < EPS);
  t.ok(Math.abs(_itemZeroScores[87] - 0.00000103) < EPS);
  t.ok(Math.abs(_itemOneScores[0] - 0.00000438) < EPS);
  t.ok(Math.abs(_itemOneScores[38] - 0.27464443) < EPS);
  t.ok(Math.abs(_itemOneScores[87] - 0.00002743) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpIq Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_iq.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpIqCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], undefined, undefined);
    [state, logits] = model.evaluate(state, [1, 2], undefined, undefined);
    [state, logits] = model.evaluate(state, [2, 3], undefined, undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[30] - 1.73978e-05) < EPS);
  t.ok(Math.abs(_itemZeroScores[43] - 0.122488) < EPS);
  t.ok(Math.abs(_itemZeroScores[50] - 0.0412105) < EPS);
  t.ok(Math.abs(_itemOneScores[30] - 4.80306e-05) < EPS);
  t.ok(Math.abs(_itemOneScores[44] - 0.0945489) < EPS);
  t.ok(Math.abs(_itemOneScores[50] - 0.0322679) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpIqAuto Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_iq_auto.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpIqAutoCfg();
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], [-1, -1], undefined);
    [state, logits] = model.evaluate(state, [1, 2], [43, 44], undefined);
    [state, logits] = model.evaluate(state, [2, 3], [45, 46], undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[36] - 0.208103) < EPS);
  t.ok(Math.abs(_itemZeroScores[37] - 0.202658) < EPS);
  t.ok(Math.abs(_itemZeroScores[38] - 0.168885) < EPS);
  t.ok(Math.abs(_itemOneScores[40] - 0.0917218) < EPS);
  t.ok(Math.abs(_itemOneScores[41] - 0.356714) < EPS);
  t.ok(Math.abs(_itemOneScores[42] - 0.307399) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpIqAutoNb4Fused Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_iq_nb4_auto.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpIqAutoCfg(true, 4);
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], [-1, -1], undefined);
    [state, logits] = model.evaluate(state, [1, 2], [43, 44], undefined);
    [state, logits] = model.evaluate(state, [2, 3], [45, 46], undefined);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[45] - 0.0458911) < EPS);
  t.ok(Math.abs(_itemZeroScores[46] - 0.196951) < EPS);
  t.ok(Math.abs(_itemZeroScores[47] - 0.633889) < EPS);
  t.ok(Math.abs(_itemOneScores[50] - 0.0801877) < EPS);
  t.ok(Math.abs(_itemOneScores[51] - 0.14094) < EPS);
  t.ok(Math.abs(_itemOneScores[52] - 0.0106244) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('StpIqAutoDt Config Correctness', async (t: test.Test) => {
  const batchSize = 2;
  const modelWeightsFp = 'testdata/stp_iq_auto_dt.json';

  const vars = loadJSONModelWeights(modelWeightsFp);

  const cfg = new PianoGenieModel.StpIqAutoDtCfg(true);
  const model = new PianoGenieModel.Model(cfg);

  await model.initialize(undefined, vars);

  let state = model.createZeroState(batchSize);
  let logits: tf.Tensor2D;

  const [itemZeroScores, itemOneScores] = tf.tidy(() => {
    [state, logits] = model.evaluate(state, [0, 1], [-1, -1], [0., 0.125]);
    [state, logits] = model.evaluate(state, [1, 2], [43, 44], [0.125, 0.25]);
    [state, logits] = model.evaluate(state, [2, 3], [45, 46], [1., 1.5]);
    const scores = tf.softmax(logits, 1);
    return tf.unstack(scores, 0);
  });

  const _itemZeroScores = itemZeroScores.dataSync();
  const _itemOneScores = itemOneScores.dataSync();

  t.ok(Math.abs(_itemZeroScores[39] - 0.12285) < EPS);
  t.ok(Math.abs(_itemZeroScores[40] - 0.829168) < EPS);
  t.ok(Math.abs(_itemZeroScores[41] - 0.0366595) < EPS);
  t.ok(Math.abs(_itemOneScores[43] - 0.18577) < EPS);
  t.ok(Math.abs(_itemOneScores[44] - 0.813153) < EPS);
  t.ok(Math.abs(_itemOneScores[45] - 2.67857e-05) < EPS);

  LSTMStateUtil.dispose(state);
  itemZeroScores.dispose();
  itemOneScores.dispose();

  t.end();
});

test('Test State Copy', async (t: test.Test) => {
  const cfg = new PianoGenieModel.StpVqCfg();
  const model = new PianoGenieModel.Model(cfg);

  const batchSize = 8;
  const chosenItem = 3;

  const state = model.createZeroState(batchSize);

  tf.tidy(() => {
    for (let i = 0; i < cfg.RNN_NLAYERS; ++i) {
      state.c[i] = tf.add(state.c[i], tf.randomNormal([batchSize, cfg.RNN_NUNITS]));
      state.h[i] = tf.add(state.h[i], tf.randomNormal([batchSize, cfg.RNN_NUNITS]));
    }

    const stateCopied = LSTMStateUtil.copyItemToBatch(state, chosenItem);

    for (let i = 0; i < cfg.RNN_NLAYERS; ++i) {
      const cUnstacked = tf.unstack(state.c[i], 0);
      const hUnstacked = tf.unstack(state.h[i], 0);
      const cCopiedUnstacked = tf.unstack(stateCopied.c[i], 0);
      const hCopiedUnstacked = tf.unstack(stateCopied.h[i], 0);
      for (let j = 0; j < batchSize; ++j) {
        t.deepEqual(cCopiedUnstacked[j].dataSync(), cUnstacked[chosenItem].dataSync());
        t.deepEqual(hCopiedUnstacked[j].dataSync(), hUnstacked[chosenItem].dataSync());
      }
    }
  });

  LSTMStateUtil.dispose(state);
  t.end();
});
