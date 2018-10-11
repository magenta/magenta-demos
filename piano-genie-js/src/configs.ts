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

import * as PianoGenieModel from './model';
import { SamplingType } from './sample';

const BASE_PATH = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/';

export type PianoGenieUserParameters = {
  lookAhead: boolean,
  samplingType: SamplingType,
  categoricalTemperature: number,
  neuralCacheTheta: number,
  cacheLambda: number
};

const categoricalUserParameters: PianoGenieUserParameters = {
  lookAhead: true,
  samplingType: SamplingType.Categorical,
  categoricalTemperature: 0.25,
  neuralCacheTheta: 0.,
  cacheLambda: 0.
}

const categoricalDeltaTimeUserParameters: PianoGenieUserParameters = {
  lookAhead: false,
  samplingType: SamplingType.Categorical,
  categoricalTemperature: 0.25,
  neuralCacheTheta: 0.,
  cacheLambda: 0.
}

export type PianoGenieConfig = {
  readonly name: string,
  readonly uri: string,
  readonly modelCfg: PianoGenieModel.ModelCfg,
  readonly defaultUserParameters: PianoGenieUserParameters
};

export const ALL_CONFIGS: { [key: string]: PianoGenieConfig } = {
  epiano_auto_no_enc: {
    name: 'Autoregressive',
    uri: BASE_PATH + 'model/epiano/auto_no_enc_483027',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_auto_no_enc_dt: {
    name: 'Autoregressive + Delta Time',
    uri: BASE_PATH + 'model/epiano/auto_no_enc_dt_516217',
    modelCfg: new PianoGenieModel.AutoNoEncDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  epiano_stp_vq_auto: {
    name: 'Step VQ-VAE + Autoregression',
    uri: BASE_PATH + 'model/epiano/stp_vq4_auto_380486',
    modelCfg: new PianoGenieModel.StpVqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_vq_auto_dt: {
    name: 'Step VQ-VAE + Autoregression + Delta Time',
    uri: BASE_PATH + 'model/epiano/stp_vq4_auto_dt_337481',
    modelCfg: new PianoGenieModel.StpVqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  epiano_stp_iq_auto: {
    name: 'Step IQ + Autoregression',
    uri: BASE_PATH + 'model/epiano/stp_iq_auto_394598',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_iq_auto_contour: {
    name: 'Step IQ + Autoregression + Contour',
    uri: BASE_PATH + 'model/epiano/stp_iq_auto_contour_175255',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_iq_auto_contour_dt: {
    name: 'Step IQ + Autoregression + Contour + Delta Time',
    uri: BASE_PATH + 'model/epiano/stp_iq_auto_contour_dt_166006',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
}

export const DEFAULT_CFG_NAME = 'epiano_stp_iq_auto_contour_dt';
