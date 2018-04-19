# Performance RNN Browser Demo

This code is a port of the [Performance RNN](https://magenta.tensorflow.org/performance-rnn) model
to the [TensorFlow.js](https://js.tensorflow.org) environment.

<img src="https://magenta.tensorflow.org/assets/performance_rnn/performance_rnn.gif">

# Demo

To view a hosted version of the demo, go to https://goo.gl/magenta/performancernn-demo

# Building

To build, execute `yarn bundle`. This will regenerate `bundle.js`, which is referenced by `index.html`.

To view, just start a webserver pointing to this directory (e.g., `python -m SimpleHTTPServer 8000`).
