import * as PianoGenieModel from './model';
import { SamplingType } from './sample';

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
    uri: 'model/epiano/auto_no_enc_483027',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_auto_no_enc_dt: {
    name: 'Autoregressive + Delta Time',
    uri: 'model/epiano/auto_no_enc_dt_516217',
    modelCfg: new PianoGenieModel.AutoNoEncDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  epiano_stp_vq_auto: {
    name: 'Step VQ-VAE + Autoregression',
    uri: 'model/epiano/stp_vq4_auto_380486',
    modelCfg: new PianoGenieModel.StpVqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_vq_auto_dt: {
    name: 'Step VQ-VAE + Autoregression + Delta Time',
    uri: 'model/epiano/stp_vq4_auto_dt_337481',
    modelCfg: new PianoGenieModel.StpVqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  epiano_stp_iq_auto: {
    name: 'Step IQ + Autoregression',
    uri: 'model/epiano/stp_iq_auto_394598',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_iq_auto_contour: {
    name: 'Step IQ + Autoregression + Contour',
    uri: 'model/epiano/stp_iq_auto_contour_175255',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_iq_auto_contour_dt: {
    name: 'Step IQ + Autoregression + Contour + Delta Time',
    uri: 'model/epiano/stp_iq_auto_contour_dt_166006',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  epiano_stp_iq_auto_contour_deviate: {
    name: 'Step IQ + Autoregression + Contour + Deviate',
    uri: 'model/epiano/stp_iq_auto_contour_deviate_114680',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  epiano_stp_iq_auto_contour_deviate_dt: {
    name: 'Step IQ + Autoregression + Contour + Deviate + Delta Time',
    uri: 'model/epiano/stp_iq_auto_contour_deviate_dt_92452',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
}

export const DEFAULT_CFG_NAME = 'epiano_stp_iq_auto_contour_dt';
