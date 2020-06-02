# Copyright 2017 Google Inc

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#   https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Adapted from the Open NSynth Super audio generation pipeline found at
# https://github.com/googlecreativelab/open-nsynth-super/tree/master/audio
# Changes were made to ensure output audio files conform with the NSynth
# MaxForLive device's epectations and so that the entire pipeline could be
# run at once.
import json, os, sys, re, subprocess, fnmatch, time
from os.path import basename, isfile
from math import floor, ceil
from multiprocessing.dummy import Pool as ThreadPool
import librosa
import scipy.io
import numpy as np
from tqdm import tqdm
from itertools import product

#  load the settings file
settings = None
with open('settings.json', 'r') as infile:
  settings = json.load(infile)

#  preserve the working directory path
source_dir = os.getcwd()

def compute_embeddings():
  #   convert all aif files to wav
  if ['aif' in f for f in os.listdir('audio_input')]:
    os.makedirs('aif_bkp', exist_ok=True)
    for fname in os.listdir('audio_input'):
      if 'aif' in fname:
        nfn = 'audio_input/'+fname.replace('aif', 'wav')
        subprocess.call(["sox", 'audio_input/'+fname, "-b", "16", "-r", "16000", "-c", "1", nfn])
        os.rename('audio_input/'+fname, 'aif_bkp/'+fname)

  subprocess.check_call(["nsynth_save_embeddings",
    "--checkpoint_path=%s/model.ckpt-200000" % settings['checkpoint_dir'],
    "--source_path=%s/audio_input" % source_dir,
    "--save_path=%s/working_dir/embeddings/input" % source_dir,
    "--batch_size=%i" % settings["batch_size_embeddings"],
    "--sample_length=%s" % settings["final_length"]])


def correct_truncated_names():
  for original_name in os.listdir('audio_input'):
    if isfile('working_dir/embeddings/input/'+os.path.splitext(original_name)[0]+"_embeddings.npy"):
      continue
    else:
      for misnomer in os.listdir('working_dir/embeddings/input'):
        if misnomer.replace('_embeddings.npy','') in original_name:
          os.rename('working_dir/embeddings/input/'+misnomer,
                'working_dir/embeddings/input/'+os.path.splitext(original_name)[0]+"_embeddings.npy")
          break


def interpolate_embeddings():
  #  constants and rearrangement of settings vars for processing
  pitches = settings['pitches']
  resolution = settings['resolution']
  final_length = settings['final_length']
  instrument_grid = settings['instruments']
  grid_size = len(instrument_grid[0]) - 1

  #  set up sub grid
  res = (resolution - 1) * grid_size + 1
  eps = 1e-10 # required to ensure correct organization of samples in multigrids
  x, y = np.meshgrid(np.linspace(eps, grid_size, res + 1), np.linspace(eps, grid_size, res + 1))
  x = x.reshape(-1) - eps
  y = y.reshape(-1) - eps
  xy_grid = zip(x, y)

  #  cache all embeddings
  embeddings_lookup = {}

  for filename in os.listdir('working_dir/embeddings/input/'):
    #  ignore all non-npy files
    if '.npy' in  filename:
      #  convert filename to reference key
      parts = basename(filename).split('_')
      reference = '{}_{}'.format(parts[0], parts[1])

      #  load the saved embedding
      embeddings_lookup[reference] = np.load("working_dir/embeddings/input/%s" % filename)

  def get_embedding(instrument, pitch):
    reference = '{}_{}'.format(instrument, pitch)
    return embeddings_lookup[reference]

  def get_instruments(xy):
    uv = (int(floor(xy[0])), int(floor(xy[1])))
    return [instrument_grid[uv[0]][uv[1]],instrument_grid[uv[0]][uv[1]+1],
        instrument_grid[uv[0]+1][uv[1]],instrument_grid[uv[0]+1][uv[1]+1]]

  def get_weights(xy):
    uv = (int(floor(xy[0])), int(floor(xy[1])))
    corners = np.array([[uv[0],uv[1]], [uv[0],uv[1]+1], [uv[0]+1,uv[1]], [uv[0]+1,uv[1]+1]])
    distances = np.linalg.norm(xy - corners, axis=1)
    distances = np.maximum(1 - distances, 0)
    distances /= distances.sum()
    return distances

  done = set()

  os.makedirs('working_dir/embeddings/interp', exist_ok=True)

  for idx, xy in enumerate(xy_grid):
    sub_grid, weights = get_instruments(xy), get_weights(xy)
    for pitch in pitches:
      embeddings = np.asarray([get_embedding(instrument, pitch) for instrument in sub_grid])
      interp = (embeddings.T * weights).T.sum(axis=0)

      name = "%s_%06d_x%.2f_y%.2f_pitch%s" % (settings['name'], idx, xy[0], xy[1], pitch)
      np.save('working_dir/embeddings/interp/' + name + '.npy', interp.astype(np.float32))


def batch_embeddings():
  num_embeddings = len(os.listdir('working_dir/embeddings/interp/'))
  batch_size = num_embeddings / settings['gpus']

  os.makedirs('working_dir/audio', exist_ok=True)

  #  split the embeddings per gpu in folders
  for i in range(0, settings['gpus']):
    foldername = 'working_dir/embeddings/interp/batch%i' % i
    os.makedirs(foldername, exist_ok=True)
    output_foldername = 'working_dir/audio/batch%i' % i
    os.makedirs(output_foldername, exist_ok=True)

  #  shuffle to the folders
  batch = 0
  for filename in os.listdir('working_dir/embeddings/interp'):
    if os.path.isfile('working_dir/embeddings/interp/' + filename) and not filename.startswith('.'):
      target_folder = 'working_dir/embeddings/interp/batch%i/' % batch
      batch += 1
      if batch >= settings['gpus']:
        batch = 0
      os.rename('working_dir/embeddings/interp/' + filename, target_folder + filename)


#  format call to nsynth_generate
def gen_call(gpu):
  print("Generating on GPU %i"%gpu)
  return subprocess.call(["nsynth_generate",
    "--checkpoint_path=%s/model.ckpt-200000" % settings['checkpoint_dir'],
    "--source_path=%s/working_dir/embeddings/interp/batch%s" % (source_dir, gpu),
    "--save_path=%s/working_dir/audio/batch%s" % (source_dir, gpu),
    "--sample_length=%s" % settings["final_length"],
    "--batch_size=%i" % settings["batch_size_generate"],
    "--log=INFO",
    "--gpu_number=%s" % gpu])


def generate_audio():
  #  set up thread pool with a thread per gpu
  pool = ThreadPool(settings['gpus'])

  #  map calls to gpu threads
  results = pool.map_async(gen_call, range(settings['gpus']))
  time.sleep(5)
  pbar = tqdm(total=sum([len(os.listdir('working_dir/embeddings/interp/batch%s'%(i))) for i in range(settings['gpus'])]))
  pbar.set_description("Number of files for which processing has started")
  while not results.ready():
    num_files = sum([len(os.listdir('working_dir/audio/batch%s'%(i))) for i in range(settings['gpus'])])
    pbar.update(num_files - pbar.n)
    time.sleep(1)
  pbar.close()
  pool.close()
  pool.join()

  #  check that all threads returned successfully (exit code 0)
  assert sum(results.get()) == 0

  #  move files out of batch folders
  os.makedirs('working_dir/audio/raw_wav', exist_ok=True)
  subprocess.call("find working_dir/audio -name \"*.wav\" | \
                   while read f; do mv $f working_dir/audio/raw_wav/${f##*/}; done", shell=True)


def clean_files():
  original_path = os.path.join(source_dir, 'working_dir/audio/raw_wav/')
  cleaned_path = os.path.join(source_dir, 'output_grids', settings['name'])
  os.makedirs(os.path.join(source_dir, 'output_grids'), exist_ok=True)
  os.makedirs(cleaned_path, exist_ok=True)

  files = os.listdir(original_path)
  files = [f for f in files if '.wav' in f]

  for fpath in tqdm(files):
    audio, sr = librosa.core.load(os.path.join(original_path, fpath), sr=16000)

    #   remove clicks
    d = audio[1:] - audio[:-1]
    d_thresh = np.where(np.abs(d) > 1.0)[0]
    clicks = [
      c for i, c in enumerate(d_thresh[:-1])
      if d_thresh[i] + 1 == d_thresh[i + 1]
    ]
    for click in clicks:
      audio[click + 1] = (audio[click] + audio[click + 2]) / 2.0

    new_fpath = fpath.replace('gen_','')

    temp_file = os.path.join(cleaned_path, 'cleaned_' + new_fpath)
    data_16bit = audio * 2**15
    scipy.io.wavfile.write(temp_file, 16000, data_16bit.astype(np.int16))

    #  normalize audio level
    cleaned_file = os.path.join(cleaned_path, new_fpath)
    sox_cmd = "sox --norm=-12 '{}' '{}'".format(temp_file, cleaned_file)
    os.system(sox_cmd)

    #  convert to mp3
    os.system("lame --quiet '{}'".format(cleaned_file))

    #  cleanup (remove the wavs having converted to mp3)
    os.remove(temp_file)
    os.remove(cleaned_file)


def generate_options_file():
  outut_file = os.path.join(source_dir, 'output_grids', settings['name'], 'options')

  instrument_grid = settings['instruments']
  grid_size = len(instrument_grid) - 1

  min_pitch                      = str(settings['pitches'][0])
  half_steps_between_pitches     = str(settings['pitches'][1] - settings['pitches'][0])
  pitches_per_initial_instrument = str(len(settings['pitches']))
  num_interpolations             = str(int((settings['resolution'] - 1) * grid_size + 1))
  num_instruments                = str(len(instrument_grid))
  name                           = settings['name']

  with open(outut_file, 'w') as options:
    options.write('1, ')
    options.write(min_pitch)
    options.write(' ')
    options.write(half_steps_between_pitches)
    options.write(' ')
    options.write(pitches_per_initial_instrument)
    options.write(' ')
    options.write(num_interpolations)
    options.write(' ')
    options.write(num_interpolations)
    options.write(' ')
    options.write(num_instruments)
    options.write(' ')
    options.write(num_instruments)
    options.write(' ')
    options.write(name)
    options.write(';')


if __name__ == "__main__":
  print("\nComputing embeddings for each instrument at each pitch...\n")
  compute_embeddings()
  correct_truncated_names()

  print("\nInterpolating embeddings between instruments at each pitch...")
  interpolate_embeddings()

  print("\nBatchings embeddings for GPU(s)...")
  batch_embeddings()

  print("Generate audio from embeddings (this may take a while!)\n")
  # generate_audio()
  [print(" ".join(["nsynth_generate",
    "--checkpoint_path=%s/model.ckpt-200000" % settings['checkpoint_dir'],
    "--source_path=%s/working_dir/embeddings/interp/batch%s" % (source_dir, gpu),
    "--save_path=%s/working_dir/audio/batch%s" % (source_dir, gpu),
    "--sample_length=%s" % settings["final_length"],
    "--batch_size=%i" % settings["batch_size_generate"],
    "--log=INFO",
    "--gpu_number=%s" % gpu])) for gpu in range(settings['gpus'])]
  input("\nRun the above command(s) in another terminal.\nPress CTRL+C to kill them once they have generated the number of samples you want (sample_length=...)\nFinally, press Enter here to continue...")

  #  move files out of batch folders
  os.makedirs('working_dir/audio/raw_wav', exist_ok=True)
  subprocess.call("find working_dir/audio -name \"*.wav\" | \
                   while read f; do mv $f working_dir/audio/raw_wav/${f##*/}; done", shell=True)

  print("\nCleaning up generated audio files...\n")
  clean_files()

  generate_options_file()
