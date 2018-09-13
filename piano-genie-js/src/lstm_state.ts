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

export type LSTMState = { c: tf.Tensor2D[], h: tf.Tensor2D[] };

export class LSTMStateUtil {
  static createZero(batchSize: number, numLayers: number, numUnits: number) {
    const zeroState: LSTMState = { c: [], h: [] };
    for (let i = 0; i < numLayers; ++i) {
      zeroState.c.push(tf.zeros([batchSize, numUnits], 'float32'));
      zeroState.h.push(tf.zeros([batchSize, numUnits], 'float32'));
    }
    // MAKE SURE TO DISPOSE OF THIS
    return zeroState;
  }

  static dispose(state: LSTMState) {
    for (let i = 0; i < state.c.length; ++i) {
      state.c[i].dispose();
      state.h[i].dispose();
    }
  }

  static clone(state: LSTMState) {
    const clonedState: LSTMState = {c: [], h: []};
    for (let i = 0; i < state.c.length; ++i) {
      clonedState.c.push(tf.clone(state.c[i]));
      clonedState.h.push(tf.clone(state.h[i]));
    }
    return clonedState;
  }

  static getRepresentative(state: LSTMState) {
    const numLayers = state.c.length;
    return state.h[numLayers - 1];
  }

  static copyItemToBatch(state: LSTMState, item: number) {
    const numLayers = state.c.length;
    const batchSize = state.c[0].shape[0];

    if (item >= batchSize) {
      throw new Error('Invalid index specified');
    }

    const copiedState: LSTMState = tf.tidy(() => {
      const copiedState: LSTMState = {c: [], h: []};
      for (let i = 0; i < numLayers; ++i) {
        const cUnstacked = tf.unstack(state.c[i], 0);
        const hUnstacked = tf.unstack(state.h[i], 0);
        const cCopied = [];
        const hCopied = [];
        for (let j = 0; j < batchSize; ++j) {
          cCopied.push(tf.clone(cUnstacked[item]));
          hCopied.push(tf.clone(hUnstacked[item]));
        }
        copiedState.c.push(tf.stack(cCopied, 0) as tf.Tensor2D);
        copiedState.h.push(tf.stack(hCopied, 0) as tf.Tensor2D);
      }
      return copiedState;
    });
    return copiedState;
  }
}
