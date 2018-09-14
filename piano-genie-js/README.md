# Piano Genie Demo

This model is the user interface and inference component of [Piano Genie](https://github.com/tensorflow/magenta/tree/master/magenta/models/piano_genie). Piano Genie allows you to control an 88-key piano via an intelligent 8-button interface.

## Demo

To view a hosted version of the demo, go to https://tensorflow.github.io/magenta-demos/piano-genie

## Building

To build, execute `yarn build` in the project directory. Then, type `yarn serve` to start a local server for the web demo.

## Testing

To test the models, first [download the test models bundled as JSON files](https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/testdata.zip). Extract the models into `piano-genie-js/testdata` and type `yarn test`.
