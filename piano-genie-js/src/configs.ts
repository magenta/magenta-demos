import * as PianoGenieModel from './model';
import { SamplingType } from './sample';

export type PianoGenieUserParameters = {
  lookAhead: boolean,
  samplingType: SamplingType,
  categoricalTemperature: number,
  neuralCacheTheta: number,
  cacheLambda: number
};

const greedyUserParameters: PianoGenieUserParameters = {
  lookAhead: true,
  samplingType: SamplingType.Greedy,
  categoricalTemperature: 0,
  neuralCacheTheta: 0,
  cacheLambda: 0
}

const categoricalUserParameters: PianoGenieUserParameters = {
  lookAhead: true,
  samplingType: SamplingType.Categorical,
  categoricalTemperature: 1,
  neuralCacheTheta: 0,
  cacheLambda: 0
}

const categoricalDeltaTimeUserParameters: PianoGenieUserParameters = {
  lookAhead: false,
  samplingType: SamplingType.Categorical,
  categoricalTemperature: 1,
  neuralCacheTheta: 0,
  cacheLambda: 0
}

export type PianoGenieConfig = {
  readonly name: string,
  readonly uri: string,
  readonly modelCfg: PianoGenieModel.ModelCfg,
  readonly defaultUserParameters: PianoGenieUserParameters
};

export const ALL_CONFIGS: { [key: string]: PianoGenieConfig } = {
  auto_no_enc: {
    name: '(Classical) [1] Autoregressive Only',
    uri: 'model/auto_no_enc/321903',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(),
    defaultUserParameters: categoricalUserParameters
  },
  stp_vq_legacy: {
    name: '(Classical) [8] Step VQ-VAE (Legacy)',
    uri: 'model/stp_vq_legacy/20945',
    modelCfg: new PianoGenieModel.StpVqLegacyCfg(),
    defaultUserParameters: greedyUserParameters
  },
  stp_vq: {
    name: '(Classical) [8] Step VQ-VAE',
    uri: 'model/stp_vq/28777',
    modelCfg: new PianoGenieModel.StpVqCfg(),
    defaultUserParameters: greedyUserParameters
  },
  stp_vq_auto: {
    name: '(Classical) [8] Step VQ-VAE + Autoregression',
    uri: 'model/stp_vq_auto/41299',
    modelCfg: new PianoGenieModel.StpVqAutoCfg(),
    defaultUserParameters: categoricalUserParameters
  },
  stp_iq: {
    name: '(Classical) [8] Step IQ',
    uri: 'model/stp_iq/33989', // TODO: try 10816
    modelCfg: new PianoGenieModel.StpIqCfg(),
    defaultUserParameters: greedyUserParameters
  },
  stp_iq_auto: {
    name: '(Classical) [8] Step IQ + Autoregression',
    uri: 'model/stp_iq_auto/37977', // TODO: try 94015
    modelCfg: new PianoGenieModel.StpIqAutoCfg(),
    defaultUserParameters: categoricalUserParameters
  },
  auto_no_enc_pop: {
    name: '(Pop) [1] Autoregressive Only',
    uri: 'model/auto_no_enc/1102078',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  stp_iq_auto_pop: {
    name: '(Pop) [8] Step IQ + Autoregression',
    uri: 'model/stp_iq_auto/303081',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  stp_iq_auto_dt_pop: {
    name: '(Pop) [8] Step IQ + Autoregression + Delta Time',
    uri: 'model/stp_iq_auto_dt/240275',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  stp_iq_auto_dt_bigrnn_pop: {
    name: '(Pop) [8] Step IQ + Autoregression + Big RNN + Delta Time',
    uri: 'model/stp_iq_auto_dt/559399',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true, 8, [4, 512]),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  stp_iq_auto_pop_nb4: {
    name: '(Pop) [4] Step IQ + Autoregression',
    uri: 'model/stp_iq_auto/521280',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true, 4),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_auto_no_enc: {
    name: '(Pop) [1] Autoregressive',
    uri: 'model/newhope/auto_no_enc_2419246',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_auto_no_enc_dt: {
    name: '(Pop) [1] Autoregressive + Delta Time',
    uri: 'model/newhope/auto_no_enc_dt_3025828',
    modelCfg: new PianoGenieModel.AutoNoEncDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  newhope_auto_no_enc_big: {
    name: '(Pop) [1] Autoregressive + Big RNN',
    uri: 'model/newhope/auto_no_enc_big_1810312',
    modelCfg: new PianoGenieModel.AutoNoEncCfg(true, [4, 512]),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_auto_no_enc_dt_big: {
    name: '(Pop) [1] Autoregressive + Delta Time + Big RNN',
    uri: 'model/newhope/auto_no_enc_dt_big_1675884',
    modelCfg: new PianoGenieModel.AutoNoEncDtCfg(true, [4, 512]),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  newhope_stp_vq_auto: {
    name: '(Pop) [8] Step VQ-VAE + Autoregression',
    uri: 'model/newhope/stp_vq_auto_229011',
    modelCfg: new PianoGenieModel.StpVqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_vq_auto_dt: {
    name: '(Pop) [8] Step VQ-VAE + Autoregression + Delta Time',
    uri: 'model/newhope/stp_vq_auto_dt_1173928',
    modelCfg: new PianoGenieModel.StpVqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  newhope_stp_vq_auto_big: {
    name: '(Pop) [8] Step VQ-VAE + Autoregression + Big RNN',
    uri: 'model/newhope/stp_vq_auto_big_57237',
    modelCfg: new PianoGenieModel.StpVqAutoCfg(true, [4, 512]),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_vq_auto_dt_big: {
    name: '(Pop) [8] Step VQ-VAE + Autoregression + Delta Time + Big RNN',
    uri: 'model/newhope/stp_vq_auto_dt_big_62956',
    modelCfg: new PianoGenieModel.StpVqAutoDtCfg(true, [4, 512]),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  newhope_stp_iq_auto: {
    name: '(Pop) [8] Step IQ + Autoregression',
    uri: 'model/newhope/stp_iq_auto_224891',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour',
    uri: 'model/newhope/stp_iq_auto_contour_1376177',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour_deviate: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour + Deviate',
    uri: 'model/newhope/stp_iq_auto_contour_deviate_426594',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour_deviate_dt: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour + Deviate + Delta Time',
    uri: 'model/newhope/stp_iq_auto_contour_deviate_dt_275724',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
  newhope_stp_iq_auto_big: {
    name: '(Pop) [8] Step IQ + Autoregression + Big RNN',
    uri: 'model/newhope/stp_iq_auto_big_346833',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true, undefined, [4, 512]),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour_big: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour + Big RNN',
    uri: 'model/newhope/stp_iq_auto_contour_big_831018',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true, undefined, [4, 512]),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour_deviate_big: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour + Deviate + Big RNN',
    uri: 'model/newhope/stp_iq_auto_contour_deviate_big_838563',
    modelCfg: new PianoGenieModel.StpIqAutoCfg(true, undefined, [4, 512]),
    defaultUserParameters: categoricalUserParameters
  },
  newhope_stp_iq_auto_contour_deviate_dt_big: {
    name: '(Pop) [8] Step IQ + Autoregression + Contour + Deviate + Delta Time + Big RNN',
    uri: 'model/newhope/stp_iq_auto_contour_deviate_dt_big_863472',
    modelCfg: new PianoGenieModel.StpIqAutoDtCfg(true, undefined, [4, 512]),
    defaultUserParameters: categoricalDeltaTimeUserParameters
  },
}

export const DEFAULT_CFG_NAME = 'stp_iq_auto_dt_pop';
