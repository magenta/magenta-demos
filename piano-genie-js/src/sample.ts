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

export const CACHE_SIZE = 16;

export const enum SamplingType {
  Greedy = 0,
  Categorical,
  ButtonUnigram,
  NeuralCache
};

export function sampleGreedy(logits: tf.Tensor2D) {
  return tf.argMax(logits, 1) as tf.Tensor1D;
}

function safeSoftmaxWithTemperature(logits: tf.Tensor2D, temperature?: number) {
  let result: tf.Tensor2D;
  if (temperature === undefined || temperature === 1) {
    result = tf.softmax(logits, 1);
  } else if (temperature === 0) {
    result = tf.oneHot(tf.argMax(logits, 1) as tf.Tensor1D, logits.shape[1]) as tf.Tensor2D;
  } else {
    result = tf.softmax(tf.div(logits, tf.scalar(temperature, 'float32')), 1) as tf.Tensor2D;
  }
  return result;
}

export function sampleCategorical(logits: tf.Tensor2D, temperature?: number) {
  const samples: tf.Tensor1D = tf.tidy(() => {
    const scores = safeSoftmaxWithTemperature(logits, temperature);
    return tf.multinomial(scores, 1, undefined, true) as tf.Tensor1D;
  });
  return samples;
}

class Cache<T> {
  protected length: number;
  protected cache: T[] = [];
  protected maxLen: number;

  constructor(maxLen: number) {
    this.maxLen = maxLen;
    this.reset();
  }

  push(val: T) {
    if (this.isFull()) {
      this.cache.splice(0, 1);
    }
    this.cache.push(val);
    this.length = this.cache.length;
  }

  reset() {
    this.cache = [];
    this.length = 0;
  }

  isFull() {
    return this.cache.length === this.maxLen;
  }

  getLength() {
    return this.length;
  }

  getMaxLength() {
    return this.maxLen;
  }

  getItems() {
    return this.cache;
  }

  // TODO: fix --downlevelIteration
  [Symbol.iterator]() {
    let pointer = 0;
    const cache = this.cache;

    return {
      next(): IteratorResult<T> {
        if (pointer < cache.length) {
          return {
            done: false,
            value: cache[pointer++]
          }
        } else {
          return {
            done: true,
            value: null
          }
        }
      }
    }
  }
}

export class NeuralCache extends Cache<[tf.Tensor2D, Int32Array]> {
  push(val: [tf.Tensor2D, Int32Array]) {
    if (this.isFull()) {
      this.cache[0][0].dispose();
    }
    super.push(val);
  }

  dispose() {
    for (let i = 0; i < this.getLength(); ++i) {
      this.cache[i][0].dispose();
    }
  }

  reset() {
    this.dispose();
    super.reset();
  }
}

export class ButtonCache extends Cache<[number, number]> { };

export function sampleButtonUnigram(
  logits: tf.Tensor2D,
  cache: ButtonCache,
  button: number,
  temperature: number,
  lambda: number) {
  const [batchSize, numClasses] = logits.shape;

  const samples: tf.Tensor1D = tf.tidy(() => {
    const pModels = safeSoftmaxWithTemperature(logits, temperature);

    const pModelsArr = tf.unstack(pModels, 0) as tf.Tensor1D[];

    const pSamps: tf.Tensor1D[] = [];
    for (let i = 0; i < batchSize; ++i) {
      const pModel = pModelsArr[i];

      let pCache: tf.Tensor1D;
      if (cache.isFull()) {
        const densities = new Float32Array(numClasses);
        let totalDensity = 0;

        for (const [b_k, x_kp1] of cache.getItems()) {
          if (b_k === button) {
            densities[x_kp1] += 1;
            totalDensity += 1;
          }
        }

        if (totalDensity > 0) {
          pCache = tf.tensor1d(densities, 'float32');
          pCache = tf.div(pCache, tf.scalar(totalDensity, 'float32'));
        }
      }

      let pSamp = pModel;
      const lambdaScalar = tf.scalar(lambda, 'float32');
      if (pCache !== undefined) {
        pSamp = tf.add(tf.mul(tf.sub(tf.scalar(1., 'float32'), lambdaScalar), pModel), tf.mul(lambdaScalar, pCache));
      }

      pSamps.push(pSamp);
    }

    const adjustedScores = tf.stack(pSamps, 0) as tf.Tensor2D;
    return tf.multinomial(adjustedScores, 1, undefined, true) as tf.Tensor1D;
  });

  return samples;
}


export function sampleNeuralCache(
  logits: tf.Tensor2D,
  cache: NeuralCache,
  states: tf.Tensor2D,
  temperature: number,
  lambda: number,
  theta: number) {
  const [batchSize, numClasses] = logits.shape;
  if (states.shape[0] !== batchSize) {
    throw new Error();
  }
  const stateDim = states.shape[1];

  const samples: tf.Tensor1D = tf.tidy(() => {
    const pModels = safeSoftmaxWithTemperature(logits, temperature);

    const pModelsArr = tf.unstack(pModels, 0) as tf.Tensor1D[];
    const statesArr = tf.unstack(states, 0) as tf.Tensor1D[];

    const pSamps: tf.Tensor1D[] = [];
    for (let i = 0; i < batchSize; ++i) {
      const pModel = pModelsArr[i];
      const state = statesArr[i];

      let pCache: tf.Tensor1D;
      if (cache.isFull()) {
        const densities = new Float32Array(numClasses);
        let totalDensity = 0;

        for (const [h_k, x_kp1] of cache.getItems()) {
          const x_kp1_i = x_kp1[i];
          let density: number;
          if (theta === 0) {
            density = 1;
          } else {
            const h_k_i = tf.squeeze(tf.slice(h_k, [0, 0], [1, stateDim])) as tf.Tensor1D;
            const dotProduct = tf.dot(state, h_k_i) as tf.Scalar;
            density = Math.exp(theta * dotProduct.dataSync()[0]);
          }
          densities[x_kp1_i] += density;
          totalDensity += density;
        }

        pCache = tf.tensor1d(densities, 'float32');
        pCache = tf.div(pCache, tf.scalar(totalDensity, 'float32'));
      }

      let pSamp = pModel;
      const lambdaScalar = tf.scalar(lambda, 'float32');
      if (pCache !== undefined) {
        pSamp = tf.add(tf.mul(tf.sub(tf.scalar(1., 'float32'), lambdaScalar), pModel), tf.mul(lambdaScalar, pCache));
      }

      pSamps.push(pSamp);
    }

    const adjustedScores = tf.stack(pSamps, 0) as tf.Tensor2D;
    return tf.multinomial(adjustedScores, 1, undefined, true) as tf.Tensor1D;
  });

  return samples;
}
