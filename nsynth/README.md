# NSynth

In a [blog post](https://magenta.tensorflow.org/nsynth-instrument), we describe the details of NSynth (Neural Audio Synthesis), a new approach to audio synthesis using neural networks.

There are three main ways to use NSynth:

* An interactive [AI Experiment](https://g.co/soundmaker) made in collaboration with Google Creative Lab that lets you interpolate between pairs of instruments to create new sounds.

* A MaxForLive Device that integrates into both [Max MSP](https://cycling74.com/products/max/) and [Ableton Live](https://www.ableton.com/en/live/). It allows you to explore the space of NSynth sounds through an intuitive grid interface. [[<b>DOWNLOAD</b>]](http://download.magenta.tensorflow.org/demos/nsynth/NSynthProject.zip)

* Create your own audio samples with the [pretrained network](https://github.com/tensorflow/magenta/tree/master/magenta/models/nsynth).

See also the Jupyter notebook for NSynth in the [/jupyter-notebooks](/jupyter-notebooks)
directory.

## Creating samples for the MaxForLive Device

By following this guide, you will be able to prepare audio samples in WAV/AIF format, process and interpolate them using NSynth, and use them with the MaxForLive NSynth device.

A fast computer is required to produce audio in a reasonable amount of time; however it is possible to speed up the process by simplifying the task. The variables are:

- Batch size (per process)
- Number of instruments
- Number of example pitches
- Grid resolution

As an example, a complex interpolation task including 16 different instruments, a 9x9 grid resolution, and 16 example pitches takes around 9 hours on a GTX 1080 Ti and will generate 10000 audio files total. The default settings.json in this repository will generate a multigrid (4 grids in one) with these properties (source audio is available [here](https://storage.googleapis.com/open-nsynth-super/audio/onss_source_audio.tar.gz)).

You will need a Unix-like PC or server with at least one CUDA-compatible GPU and magenta, sox, and lame installed.

### 1. Preparing audio
NSynth requires one-note samples for each of the desired source sounds across a range of pitches. In the default configuration, these should be 4000ms long. Optionally, you can release the note after 3000ms to leave a decay, however this is subjective, and something to experiment with.

According to the default settings, these files should be created at the following MIDI notes:

- 24 (C2)
- 28 (E2)
- 32 (G#2)
- 36 (C3)
- 40 (E3)
- 44 (G#3)
- 48 (C4)
- 52 (E4)
- 56 (G#4)
- 60 (C5)
- 64 (E5)
- 68 (G#5)
- 72 (C6)
- 76 (E6)
- 80 (G#6)
- 84 (C7)


For instruments that are out of range at any of these pitches, you can pitch down or up using software, or repeat the nearest "available" pitch to fill in the gaps. Alternatively, for unpitched sounds like drums you can maintain a single pitch across all notes, or pitch each one manually.

Changing these conditioning values can result in interesting different combinations and is one of the most interesting and powerful ways to alter the behavior of the instrument.

Samples should be named using the following convention:

```
[soundname]_[pitch].wav
```

For example, the sound ‘guitar’ would be stored as:

```
guitar_24.wav
guitar_28.wav
...
```

Note that a section of the magenta pipeline (specifically nsynth_save_embeddings) sometimes truncates a couple characters from the start of filenames. generate.py should automatically catch this, however, it might "correct" files in unexpected ways if any filenames are substrings of other file names (having 'guitar' and 'acoustic_guitar' instruments in the same grid is dangerous while 'electric_guitar' and 'acoustic_guitar' is not).

Audio should be saved as 16-bit integer wave files at 16000kHz. See the following soxi output for a valid input file:

```
$ soxi guitar_24.wav

Input File     : 'grungebass_24.wav'
Channels       : 1
Sample Rate    : 16000
Precision      : 16-bit
Duration       : 00:00:04.00 = 64000 samples ~ 300 CDDA sectors
File Size      : 128k
Bit Rate       : 256k
Sample Encoding: 16-bit Signed Integer PCM
```

When you have selected the input audio files you wish to interpolate, they should be placed in this directory in a folder named `audio_input` (n.b. AIF files will be converted to WAV automatically).


### 2. Update the settings file

The generation process is governed by the settings.json file. For example:
```
{
	"instruments": [["car","cleanbass", "cleanguitar", "crotales"],
                  ["marimba", "electricpiano", "grungebass", "electrotom"],
                  ["flute", "electrokick", "distortedguitar", "resopad"],
                  ["rhodes", "sitar", "snare", "susvox"]],
	"checkpoint_dir":"~/magenta/magenta/models/nsynth/wavenet-ckpt",
	"pitches":      [24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84],
	"resolution": 	           9,
	"final_length":            64000,
	"gpus":                    1,
	"batch_size_embeddings":   32,
	"batch_size_generate":     256,
	"name":         "multigrid_4"
}
```

##### instruments
The 2 dimensional list of instruments to be interpolated. The placement of the instrument names in this grid determines where they will appear in the NSynth device. The first entry of the first list will be in the bottom left of the grid, while the last entry in the last list will be in the top right. The lists should reflect the instrument filenames, i.e. ‘guitar’ will point generate.py to all the correctly named ‘guitar_24.wav’, ‘guitar_28.wav’ files.

##### checkpoint_dir
This should point to the directory containing the WaveNet checkpoint file to use.

##### pitches
This is a list of the different input pitches that should be interpolated by the pipeline. Notes between these pitches will be repitched versions of the nearest generated audio files.

##### resolution
This setting controls how many inter-instrumental interpolations are created. Higher resolutions will create closer and smoother interpolations at a cost of disk space and processing time.

##### final_length
The length in samples of the output wave files (can be calculated by multiplying the desired number of seconds by 16000).

##### gpus
Set this number to match the number of GPUs your system is equipped with. This will control the number of batches the processes are split into (enabling much faster processing times).

##### batch_size_embeddings
The size of batches for embedding generation. Larger batch sizes use more VRAM. Should be set as high as possible for a given GPU and sample length for maximum speed. Using a 4 second sample length a single GTX 1080 Ti with 11 GB VRAM can handle batches of about 48.

##### batch_size_generate
The size of batches for audio generation. Once again, larger batch sizes use more VRAM. A single GTX 1080 Ti with 11 GB VRAM can handle batches of about 512.

### 3. Run generate.py

With all of the settings adjusted to reflect the input audio and the files named correctly in 'audio_input', generate.py can be run from this directory.

This should generate embeddings, interpolate them, and then generate the audio for the entire grid. The generated grid folder will be placed in 'output_grids' and can then be opened in the NSynth MaxForLive device by selecting the folder in the 'Load Sounds' browser.
