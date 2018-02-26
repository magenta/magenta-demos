// TODO: There are likely some redundant variables after moving away
// from Closure.

// Use this ROOT when talking to the server:
// var ROOT = 'https://affectivecomputing-188820.appspot.com/_ah/api';
var ROOT = 'http://localhost:8080/_ah/api';
var num_face_recordings = 30;
var image_onload_time_ = 0;
var initial_reaction_time_latency_ms = 250;


/**
 * Number of emotion recognition frames recorded this episode.
 */
num_frames_recorded_ = 0;

/**
 * Number of emotion recognition frames returned from the server this episode
 */
num_frames_returned_ = 0;

/**
 * Number of milliseconds to wait for all the FeelNet frames to be returned
 * before manually resetting.
 * WARNING. This number must be larger than (initial_reaction_time_latency_ms_ +
 * RECORDING_LATENCY_MS_ * num_face_recordings_)
 */
ms_to_wait_for_feelnet_ = 7000;

/**
 * Emotions detected recently from FeelNet.
 */
detected_emotions_ = null;

/**
 * The time at which the image first loaded
 * (to get latency for each emotion frame).
 */
image_onload_time_ = 0;

/**
 * Human reaction time latency used as a delay before face recording starts.
 */
initial_reaction_time_latency_ms_ = 250;

/**
 * Number of milliseconds between recordings of the face.
 */
RECORDING_LATENCY_MS_ = 100;

/**
 * Number of recordings of the face to make.
 */
num_face_recordings_ = 50;

/**
 * Current episode of interacting with the app. Will automatically increment.
 */
current_episode_ = 0;

/**
 * Whether the app is running in demo mode.
 */
demo_mode_ = false;

/**
 * Whether the app is running in latent experiment mode.
 */
latent_mode_ = false;

/**
 * Whether an error saying no faces could be detected has been shown for this
 * episode.
 */
face_error_shown_ = false;

/**
 * Name of the experiment being run.
 */
experiment_name_ = 'initial_launch';

/**
 * String description of the experiment being run.
 */
experiment_description_ = '';

/**
 * Whether the app is running in experimenter mode.
 */
experiment_mode_ = false;

/**
 * ID of the sketch sample currently being displayed.
 */
sketch_id_ = -1;

/**
 * ID of the image user uploaded. -1 is acceptable as a null value because real
 * python NDB IDs are always at least 1.
 */
image_id_ = -1;


/**
 * ID of the current user.
 */
user_id_ = -1;

/**
 * Xsrf token needed for security.
 */
xsrf_token_ = '';

/**
 * Logger object
 */
logger_ = console.log;

/**
 * Prefix for xssi.
 */
XSSI_PREFIX_ = ')]}\'\n';


/**
 * Cursor for next fetch.
 */
cursor_ = '';


/**
 * Safely sets the inner html of an element, first escaping the string.
 * @private
 * @param {Object} element An element from the page.
 * @param {string} msg A message to set.
*/
safeSetInnerHTML = function(element, msg) {
  element.innerHTML = safeHTMLEscape(msg);
};

/**
 * Safely sets the inner html of an element, first escaping the string.
 * @private
 * @param {string} msg to process.
 * @return {string} processed string.
*/
safeHtmlEscape = function(msg) {
  return msg;
};

/**
 * Show a message with timeout.
 * @param {string} msg Message to show
 * @param {int} timeout in milliseconds.
 */
showMessage = function(msg, timeout) {
  if (!timeout) {
    timeout = 2750;
  }
  var toastElem = document.getElementById('recording-toast');
  // TODO(douglaseck): Push the message into the toast element.
  // something like this: safeSetInnerHTML(toastElem, msg);

  // After 3 seconds, remove the show class from DIV.
  setTimeout(function() {
    toastElem.className = toastElem.className.replace('show', '');
  }, timeout);
};

/**
 * Loads a new sample when the user clicks a button on the feedback.html page
 * which gets the next sample. It will eventually be analogous to "scribble."
 * @private
 * @param {string} static_dir Path to the static directory.
 */
clickNext_ = function(static_dir) {
  console.log('ClickNext called with static_dir', static_dir);
  var button = document.getElementById('video-capture');
  if (button) {
    button.style.visibility = 'hidden';
  }
  var button2 = document.getElementById('show-image-select-modal');
  if (button2) {
    button.style.visibility = 'hidden';
  }

  if (demo_mode_) {
    var success = runDemo_();
    if (!success) {
      button.style.visibility = 'visible';
      if (button2) {
        button2.style.visibility = 'visible';
      }
      return;
    }
  }

  // Get rid of previous image in the sample-div.
  var sample_div = document.getElementById('sample-div');
  while (sample_div.firstChild) {
    sample_div.removeChild(sample_div.firstChild);
  }

  // Compute appropriate responsive heights for sketch image.
  var upload_canvas = document.getElementById('upload-canvas');
  if (upload_canvas) {
    var h = upload_canvas.scrollHeight;
    var w = upload_canvas.scrollWidth;
  } else {
    var fdiv = document.getElementById('content-feedback');
    var w = fdiv.scrollWidth;
  }

  var sample_img = document.getElementById('sample-img');

  gapi.client.load('affective', 'v1', function() {
    gapi.client.affective.get_svg({}).execute(function(response) {
      if (response.object - name) {
        console.log('Detected an object: %s', response['object_name']);
      }

      console.log('response', response);
      if (response.svg_id) {
        console.log('SVG loaded with id ' + response.svg_id);
        console.log('Data is', response.svg_image);
        sketch_id_ = response.svg_id;
        sample_img.src = 'data:image/svg+xml;utf8,' + response.svg_image;
        if (latent_mode_) {
          // Do not animate SVGs in latent mode.
          sample_img.style.display = 'inline';
          var new_dims = getDesiredWidthHeight_(
              sample_img.scrollWidth, sample_img.scrollHeight, w);
          console.log(
              'Attempting to set the w x h to: %s x %s', new_dims[0],
              new_dims[1]);
          sample_img.style.width = String(new_dims[0]) + 'px';
          sample_img.style.height = String(new_dims[1]) + 'px';
          sample_img.style.max_height = new_dims[1];
        } else if (response.width) {
          // If running in scribble mode and plotting on top of an existing
          // sketch.
          var output_div = document.getElementById('object-output-div');
          safeSetInnerHTML(output_div, '');
          var top = h * response['top'];
          var left = w * response['left'];
          console.log(
              'Trying to animate SVG over top of upload image. Desired ' +
                  'dimensions are: w=%s x h=%s, left=%s, top=%s, max w=%s',
              response['width'], response['height'], left, top, w);
          createAnimatedSVG_(
              response['svg_image'], 500, response['width'], response['height'],
              left, top);
        } else {
          console.log('Creating 500', response.width);


          createAnimatedSVG_(response.svg_image, 500, w);
        }
      } else {
        showMessage('Error: server did not send an image');
        button.style.visibility = 'visible';
        if (button2) {
          button2.style.visibility = 'visible';
        }
      }
    });
  }, ROOT);
};

/**
 * Compute the best height and width given the current width and height and the
 * ideal dimensions. Scales the image to preserve the aspect ratio, limiting it
 * to the max height.
 * @private
 * @param {number} current_width The current width of the object to scale.
 * @param {number} current_height The current height.
 * @param {number} desired_width The ideal pixel width of the image.
 * @return {!Array<number>} The scaled width and height.
 */
getDesiredWidthHeight_ = function(
    current_width, current_height, desired_width) {
  var compare_elem = document.getElementById('content');
  var max_height = compare_elem.scrollHeight;

  console.log(
      'current w: %s, current h: %s, desired w: %s, max h: %s', current_width,
      current_height, desired_width, max_height);
  var scaling_factor_width = desired_width / current_width;
  var desired_height = current_height * scaling_factor_width;
  console.log(
      'w scaling factor: %s, desired h: %s', scaling_factor_width,
      desired_height);

  if (desired_height > max_height) {
    var scaling_factor_height = max_height / current_height;
    console.log(
        'Desired height is too high. Height scaling factor: %s',
        scaling_factor_height);
    var new_width = current_width * scaling_factor_height;
    console.log('New width: %s', new_width);
    return [new_width, max_height];
  } else {
    return [desired_width, desired_height];
  }
};

/**
 * Insert an animated SVG created using an svg string.
 * @private
 * @param {string} svg_str String representation of an SVG image.
 * @param {number} time_delay Millisecond delay between animating each stroke.
 * @param {number} desired_width The ideal pixel width of the image.
 * @param {number} desired_height The ideal pixel height.
 * @param {number} left The x offset of the image in relative coordinates.
 * @param {number} top The y offset of the image in relative coordinates.
 */
createAnimatedSVG_ = function(
    svg_str, time_delay, desired_width, desired_height, left, top) {
  // Parse the SVG string into html elements.
  var parser = new DOMParser();
  doc = parser.parseFromString(svg_str, 'image/svg+xml');
  console.log('SVG STR', svg_str);

  // Format the SVG appropriately.
  doc.documentElement.classList.add('quickdraw-response-image');
  doc.documentElement.classList.add('sketch-on-top');
  doc.documentElement.setAttribute('preserveAspectRatio', true);
  var orig_svg_height = doc.documentElement.height.baseVal.value;
  var orig_svg_width = doc.documentElement.width.baseVal.value;
  console.log(
      'Setting SVG w x h to: %s x %s', doc.documentElement.width.baseVal.value,
      doc.documentElement.height.baseVal.value);

  // Insert into the DOM, store DOM elements into variables.
  var sample_div = document.getElementById('sample-div');
  sample_div.appendChild(doc.documentElement);
  console.log('Inserted SVG image elements into the DOM');
  var svg = sample_div.getElementsByTagName('svg')[0];

  // The SVG images have whitespace around them, so if placing accurately on an
  // image, need to get the size of the actual path element.
  var paths = sample_div.getElementsByTagName('path');
  var bbox = paths[0].getBBox();
  console.log('Found %s paths in the SVG', paths.length);
  console.log(
      'Bounding box of the main path is %s, %s, %s, %s', bbox['x'], bbox['y'],
      bbox['width'], bbox['height']);

  // Set the SVG width and height.
  if (desired_height && top) {
    // Scale the SVG so the bounding box of the path is the desired height in
    // the SVG coordinate system we will later define. Only important for
    // placing sketch on an image.
    var calced_height = desired_height * orig_svg_height / bbox['height'];
    var calced_width = desired_width * orig_svg_width / bbox['width'];
  } else {
    var new_dims =
        getDesiredWidthHeight_(orig_svg_width, orig_svg_height, desired_width);
    var calced_height = new_dims[1];
    var calced_width = new_dims[0];
  }
  svg.height.baseVal.value = calced_height;
  svg.width.baseVal.value = calced_width;


  // Set the SVG viewBox.
  // SVG viewbox defines a new coordinate system in which the total number of
  // coordinates on the x axis is equal to the width passed to the viewbox.
  // The first two arguments x and y give an offset in that coordinate system,
  // where a negative number means the top left corner is now a negative
  // coordinate (-x,-y) rather than (0,0). This has the effect of moving the
  // origin farther into the image, so a point normally occurring at (p,q) in
  // the original image now occurs at (p+x, p+y).
  if (!top || !left) {
    console.log('Default, no image case: plotting SVG at 0,0');
    offset_x = 0;
    offset_y = 0;
  } else {
    console.log('Trying to plot the SVG accurately on an image');
    var offset_x = bbox['x'];
    var offset_y = bbox['y'];
    console.log(
        'left: %s, top: %s, orig_svg_width: %s, orig_svg_height: %s', left, top,
        orig_svg_width, orig_svg_height);
  }
  var viewbox_str = String(offset_x) + ' ' + String(offset_y) + ' ' +
      String(orig_svg_width) + ' ' + String(orig_svg_height);
  console.log('Setting the SVG viewBox to %s', viewbox_str);
  svg.setAttribute('viewBox', viewbox_str);

  if (top || left) {
    console.log('Need to set offset of sample div to place sketch in image');
    // Set the offset of the parent div in order to offset the sketch correctly
    // within the image. If we just try to use the offset of the viewbox, the
    // sketch will move outside the viewbox area and be invisible.
    var canvas = document.getElementById('upload-canvas');
    console.log(
        'Width of canvas: %s, width of sample_div: %s', canvas.scrollWidth,
        sample_div.scrollWidth);

    var additional_x_offset = (sample_div.scrollWidth - canvas.scrollWidth) / 2;
    console.log(
        'Computing necessary additional offsets for x: %s',
        additional_x_offset);

    sample_div.style.top = String(top) + 'px';
    sample_div.style.left = String(left + additional_x_offset) + 'px';
    console.log(
        'Setting the sample div to top %s and left %s', String(top),
        String(left));
  }

  var svg_area = svg.height.baseVal.value * svg.width.baseVal.value;
  console.log('SVG area is %s', svg_area);

  // Animate each path.
  for (var i = 0; i < paths.length; i++) {
    (function(thisPath) {
      if (top || left) {
        // For sketches on images, set stroke colour to magenta.
        thisPath.setAttribute('stroke', 'rgb(224, 64, 251)');

        // Increase stroke width depending on the size of the images.
        if (svg_area < 70000) {
          thisPath.setAttribute('stroke-width', 7);
        } else {
          thisPath.setAttribute('stroke-width', 4);
        }
      } else {
        thisPath.setAttribute('stroke-width', 2);
      }

      // Get the total length.
      var totalLength = thisPath.getTotalLength();

      // Set path to invisible.
      thisPath.style.strokeDashoffset = totalLength;
      thisPath.style.strokeDasharray = totalLength + ' ' + totalLength;

      setTimeout(function() {
        var time_elapsed = performance.now() - image_onload_time_;
        console.log('Animating next stroke after %s ms', time_elapsed);
        thisPath.classList.add('animate-path');
      }, time_delay * i);
    }(paths[i]));
  }
};


/**
 * Gets the user's webcam object.
 * @private
 * @return {!Object} The user's webcam object.
 */
hasGetUserMedia_ = function() {
  return !!(
      navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia);
};

/**
 * If the webcam is successfully accessed, stream its video.
 * @private
 * @param {!Object} stream Webcam stream.
 */
videoSuccessCallback_ = function(stream) {
  var video = document.getElementById('video');
  if (window.webkitURL) {
    video.src = window.webkitURL.createObjectURL(stream);
  } else if (video.mozSrcObject !== undefined) {
    video.mozSrcObject = stream;
  } else {
    video.src = stream;
  }
};

/**
 * Display error with webcam stream.
 * @private
 * @param {string} error Error description.
 */
videoErrorCallback_ = function(error) {
  alert('There was a problem with your video! ' + error);
};


/**
 * Capture video frame.
 * @private
 */
function captureVideoFrame_() {
  var outputElem = document.getElementById('feelnet-output-div');
  var video = document.getElementById('video');
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  var time_elapsed = performance.now() - image_onload_time_;
  console.log(
      'capturing frame ' + num_frames_recorded_ +
      ' after this much time: ' + time_elapsed);

  safeSetInnerHTML(outputElem, '');
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var image = canvas.toDataURL('image/jpeg');
    call_dict = {
      'image': image,
      'svg_id': sketch_id_,
      'time_elapsed': Math.round(time_elapsed),
      'episode': current_episode_,
      'experiment_name': experiment_name_,
      'experiment_description': experiment_description_,
      'user_id': user_id_
    };
    gapi.client.load('affective', 'v1', function() {
      gapi.client.affective.emotion_detector(call_dict).execute(function(
          response) {
        if (response['episode'] !== null &&
            parseInt(response['episode']) !== current_episode_) {
          console.log('Outdated episode ID, ignoring emotion response');
        } else {
          incrementAndCheckCallsReturned_();

          console.log('Found %s faces in the images.', response['face_count']);
          if (!face_error_shown_ && parseInt(response['face_count']) < 1) {
            face_error_shown_ = true;
            showMessage('Error: could not find a face within the image.', 2750);
            setTimeout(function() {
              face_error_shown_ = false;
            }, 2750);
          }
          if (response['emotion_metrics']) {
            console.log(
                'Detected emotion metrics for episode %s, rendering...',
                response['episode']);
            rerenderEmotions_(response['emotion_metrics']);
          }
        }
      });
    }, ROOT);
  }
  num_frames_recorded_ = num_frames_recorded_ + 1;
}

/**
 * Increment the number of calls returned by FeelNet. If all have returned, call
 * a function to clean up.
 * @private
 */
incrementAndCheckCallsReturned_ = function() {
  if (num_frames_returned_ > num_face_recordings_) {
    handleFeelNetCallsReturned_();
  }
  num_frames_returned_ = (num_frames_returned_ + 1);
  console.log(
      '%s/%s frames have been returned by the emotion recognizer, ' +
          'on episode %s',
      num_frames_returned_, num_face_recordings_, current_episode_);
};

/**
 * Send an image from the webcam to the canvas, then the object detector.
 * @private
 */
detectObjectsInWebcam_ = function() {
  console.log('Sending image to server to detect objects.');
  var video = document.getElementById('video');
  var canvas = document.getElementById('upload-canvas');
  var context = canvas.getContext('2d');

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  detectObjectsInImage_();
};


/**
 * Make an asynchronous call the backend after a sample has finished being
 * viewed in order to increment the count of times it was viewed.
 * @private
 */
incrementSampleTimesViewed_ = function() {
  console.log('sketch_id is ', sketch_id_);
  gapi.client.load('affective', 'v1', function() {
    gapi.client.affective.increment_sketch_view_count({'svg_id': sketch_id_})
        .execute(function(response) {
          console.log(
              'Incremented view count to ', response.times_viewed,
              ' for svg_id ', sketch_id_);
        }, ROOT);
  });
};


/**
 * Start recording the user's face and keep doing it for several seconds.
 * @private
 */
continuouslyRecordFace_ = function() {
  var spinner = document.getElementById('emotion-spinner');
  spinner.classList.add('is-active');
  var spinner_text = document.getElementById('spinner-explanation');
  safeSetInnerHTML(spinner_text, safeHtmlEscape('Reading your expression...'));
  spinner_text.style.display = 'inline';
  var feel_div = document.getElementById('feelnet-output-div');
  feel_div.style.visibility = 'visible';
  detected_emotions_ = [];

  num_frames_recorded_ = 0;
  num_frames_returned_ = 0;
  image_onload_time_ = performance.now();
  console.log('start time: %s', image_onload_time_);
  setTimeout(captureVideoFrame_, initial_reaction_time_latency_ms_);
  showMessage('Starting face emotion recording!');

  var i = 0;
  for (i = 0; i < num_face_recordings_; i++) {
    setTimeout(
        captureVideoFrame_,
        initial_reaction_time_latency_ms_ + RECORDING_LATENCY_MS_ * (i + 1));
  }

  // Set a timeout so that if all the FeelNet recordings don't get returned
  // (i.e. one gets dropped), no matter what eventually the final cleanup
  // function will be called.
  setTimeout(function() {
    if (num_frames_returned_ > 0) {
      var time_elapsed = performance.now() - image_onload_time_;
      console.log(
          'Allowable time delay of %s ms exceeded: time elapsed = %s',
          ms_to_wait_for_feelnet_, time_elapsed);
      handleFeelNetCallsReturned_();
    }
  }, ms_to_wait_for_feelnet_);
};

/**
 * Clean up variables after most or all calls to FeelNet have returned.
 * @private
 */
handleFeelNetCallsReturned_ = function() {
  console.log('All expected calls to the emotion recognizer have returned');

  // Increment sample times viewed and episode ID.
  incrementSampleTimesViewed_();
  current_episode_ = (current_episode_ + 1);
  console.log('Incrementing the current episode to %s', current_episode_);

  var epid = document.getElementById('experiment-epid');
  if (epid) {
    console.log('Plugging episode ID into demo field');
    epid.value = current_episode_;
  }

  num_frames_returned_ = 0;

  var button = document.getElementById('video-capture');
  if (button) {
    button.style.visibility = 'visible';
  }
  var button2 = document.getElementById('show-image-select-modal');
  if (button2) {
    button2.style.visibility = 'visible';
  }

  var spinner = document.getElementById('emotion-spinner');
  spinner.classList.remove('is-active');
  var spinner_text = document.getElementById('spinner-explanation');
  var emotion_text = '';
  console.log('Detected emotions');
  console.log(detected_emotions_);
  var num_emotions = detected_emotions_.length;
  for (var i = 0; i < num_emotions; i++) {
    var emotion = detected_emotions_[i];

    // Some care should be taken in how to message the emotions.
    if (emotion === 'anger') {
      emotion_text = 'You looked angry. ' +
          'I\'ll try to draw better next time.';
      break;
    } else if (emotion === 'sorrow') {
      emotion_text = 'You looked sad. I\'ll try to draw better next time.';
      break;
    } else if (emotion === 'surprised') {
      emotion_text = 'You looked surprised. I\'ll try to draw more like this!';
      break;
    } else if (emotion === 'joy') {
      emotion_text = 'You looked joyful. I\'ll try to draw more like this!';
      break;
    }
  }
  if (!emotion_text) {
    emotion_text = 'I couldn\'t tell what you thought of that one...';
  }
  safeSetInnerHTML(spinner_text, safeHtmlEscape(emotion_text));
  console.log(emotion_text);

  var feel_div = document.getElementById('feelnet-output-div');
  feel_div.style.visibility = 'hidden';
};


/**
 * Pulls information about the current experiment from a form, triggers
 * recording of the face.
 * @private
 */
runExperiment_ = function() {
  initial_reaction_time_latency_ms_ = 0;
  num_face_recordings_ = 120;
  ms_to_wait_for_feelnet_ = 22000;
  var name = document.getElementById('experiment-name');
  var descrip = document.getElementById('experiment-descrip');
  var uid = document.getElementById('experiment-uid');
  var epid = document.getElementById('experiment-epid');
  var sampleid = document.getElementById('experiment-sampleid');
  var imgid = document.getElementById('experiment-imageid');

  var error_msg = '';
  if (name.value == '') {
    name.style.borderColor = 'red';
    error_msg = 'Missing fields: experiment name';
  }
  if (uid.value == '') {
    uid.style.borderColor = 'red';
    if (error_msg == '') {
      error_msg = 'Missing fields: user ID';
    } else {
      error_msg = error_msg + ', user ID';
    }
  }
  if (epid.value == '') {
    epid.style.borderColor = 'red';
    if (error_msg == '') {
      error_msg = 'Missing fields: episode ID';
    } else {
      error_msg = error_msg + ', episode ID';
    }
  }
  if (error_msg != '') {
    showMessage(error_msg);
    return;
  }

  if (sampleid.value == '') {
    sketch_id_ = -1;
  } else {
    sketch_id_ = parseInt(sampleid.value, 10);
  }

  if (imgid.value == '') {
    image_id_ = -1;
  } else {
    image_id_ = parseInt(imgid.value, 10);
  }

  name.style.borderColor = '#EEEEEE';
  epid.style.borderColor = '#EEEEEE';
  uid.style.borderColor = '#EEEEEE';
  sampleid.style.borderColor = '#EEEEEE';
  imgid.style.borderColor = '#EEEEEE';

  current_episode_ = parseInt(epid.value, 10);
  experiment_description_ = descrip.value;
  experiment_name_ = name.value;
  user_id_ = parseInt(uid.value, 10);

  continuouslyRecordFace_();
};

/**
 * Function that handles running the demo from a Googler's computer by ensuring
 * that a user ID and episode ID have been properly entered.
 * @private
 * @return {boolean} False if there were errors in the demo inputs, otherwise
 * true.
 */
runDemo_ = function() {
  var uid = document.getElementById('experiment-uid');
  var epid = document.getElementById('experiment-epid');

  var error_msg = '';
  if (uid.value == '') {
    uid.style.borderColor = 'red';
    error_msg = 'Missing fields: user ID';
  }
  if (epid.value == '') {
    epid.style.borderColor = 'red';
    if (error_msg == '') {
      error_msg = 'Missing fields: episode ID';
    } else {
      error_msg = error_msg + ', episode ID';
    }
  }
  if (error_msg != '') {
    showMessage(error_msg);
    return false;
  }
  epid.style.borderColor = '#EEEEEE';
  uid.style.borderColor = '#EEEEEE';

  current_episode_ = parseInt(epid.value, 10);
  user_id_ = parseInt(uid.value, 10);
  return true;
};

/**
 * Creates a formatted string of detected emotions.
 * @private
 * @param {*} emotionList Array of emotion names
 * @return {string} String of emotions.
 */
createEmotionString_ = function(emotionList) {
  var emotionString = '';

  if (emotionList.length > 0) {
    emotionString = 'I saw: ';

    // create a comma-delimited list of terms, with a period at the end.
    emotionString += emotionList.join(', ');
    emotionString += '.';
  } else {
    emotionString += 'I\'m not quite sure what you were feeling there. ' +
        'Try again?';
  }
  return emotionString;
};

/**
 * Creates a div element containing data for a detected emotion.
 * @private
 * @param {*} emotions JSON decoded object.
 * @return {Element} Created div element.
 */
createEmotionElem_ = function(emotions) {
  var emotionList = [];
  var emotionText = '';

  console.log('Parsing', emotions);
  // loop through the emotions array, and evaluate each item in it
  for (var i = 0; i < emotions.length; i++) {
    // Uncomment the line below to see all the emotions Feelnet sees:
    // console.log(emotions[i]['name'] + ': ' + emotions[i]['confidence']);
    var emotion = emotions[i];
    // console.log('Working on', emotion)
    if (emotion['confidence'] > 0.25) {
      // rename some of the emotions on the fly
      if (emotion['name'] === 'concentration') {
        emotion['name'] = 'disapproval';
      }
      if (emotion['name'] === 'contentment') {
        emotion['name'] = 'approval';
      }

      // add the approved emotions to the list
      emotionList.push(emotion['name']);
    }
  }

  // pass the list to createEmotionString_ to get a formatted string
  emotionText = createEmotionString_(emotionList);

  // create a div and toss the results in
  var elem = document.createElement('div');
  var emotion_data = safeHtmlEscape(emotionText);
  safeSetInnerHTML(elem, emotion_data);

  detected_emotions_ = emotionList;

  return elem;
};

/**
 * Appends list of emotions to the emotions div.
 * @private
 * @param {Array.<Object>} emotions List of emotion objects from JSON response.
 */
rerenderEmotions_ = function(emotions) {
  var outputElem = document.getElementById('feelnet-output-div');
  safeSetInnerHTML(outputElem, safeHtmlEscape(''));

  var emotionsOutput = createEmotionElem_(emotions);
  outputElem.appendChild(emotionsOutput);
};

/**
 * Handles the dialog close button actions.
 * @private
 * @param {Object} event The event object returned from the click listener.
 */
closeClickHandler_ = function(event) {
  // TODO(douglaseck): it feels wrong to have to redefine the dialog for
  // each of these bindings, but at the moment, I'm not getting the right
  // variables passed in. This should be refactored next.
  var dialog = document.getElementById('image-select-modal');
  dialog.close();
};

/**
 * Handles the dialog show button actions.
 * @private
 * @param {Object} event The event object returned from the click listener.
 */
showClickHandler_ = function(event) {
  // TODO(douglaseck): same as above.
  var dialog = document.getElementById('image-select-modal');
  dialog.showModal();
};

/**
 * Handles the dialog's image selection button actions.
 * @private
 * @param {Object} event The event object returned from the click listener.
 */
imageClickHandler_ = function(event) {
  var previouslySelectedEls = document.getElementsByClassName('selected');

  if (event.target.nodeName === 'IMG') {
    for (var i = 0; i < previouslySelectedEls.length; i++) {
      previouslySelectedEls[i].classList.remove('selected');
    }

    event.target.classList.add('selected');

    // Get rid of previous sketch and text
    var sample_div = document.getElementById('sample-div');
    while (sample_div.firstChild) {
      sample_div.removeChild(sample_div.firstChild);
    }
    var output_div = document.getElementById('object-output-div');
    while (output_div.firstChild) {
      output_div.removeChild(output_div.firstChild);
    }

    // Insert into the canvas.
    var canvas = document.getElementById('upload-canvas');
    var ctx = canvas.getContext('2d');
    var fdiv = document.getElementById('content-feedback');
    console.log('Event target:?? %s', event.target);
    console.log(
        'Natural image dimensions: %s x %s', event.target.naturalWidth,
        event.target.naturalHeight);
    var new_dims = getDesiredWidthHeight_(
        event.target.naturalWidth, event.target.naturalHeight,
        fdiv.scrollWidth);
    canvas.width = new_dims[0];
    canvas.height = new_dims[1];
    ctx.drawImage(event.target, 0, 0, new_dims[0], new_dims[1]);

    // Center the canvas.
    var offset_x = (fdiv.scrollWidth - new_dims[0]) / 2;
    canvas.style.left = String(offset_x) + 'px';

    console.log('Attempting to detect objects in image chosen by user');
    detectObjectsInImage_();
  }

  // close it up!
  closeClickHandler_();

  event.stopPropagation();
};


/**
 * Setup function.
 * @export
 * @param {string} static_dir Path to the directory of static files.
 * @param {string} xsrf_token String security token.
 * @param {number} user_id Integer user ID from backend.
 * @param {boolean} demo_mode 1 if the app is being run in demo mode.
 * @param {boolean} get_webcam 1 if the app should access the user's webcam.
 * @param {boolean} latent_experiment 1 if running the latent experiment.
 * @param {boolean} scribble_mode 1 if running scribble mode.
 */
setup = function(
    static_dir, xsrf_token, user_id, demo_mode, get_webcam, latent_experiment,
    scribble_mode) {
  console.log('setup called');
  console.log('static_dir ' + static_dir);
  console.log('user_id', user_id);
  console.log('demo_mode', demo_mode);
  console.log('get_webcam', get_webcam);
  console.log('latent_experiment', latent_experiment);
  console.log('scribble_mode', scribble_mode);

  // document.querySelector('#video-capture').addEventListener('click',
  // onButtonClick); startVideoStream();

  // TODO TOS.
  user_id_ = user_id;
  xsrf_token_ = xsrf_token;


  if (demo_mode) {
    console.log('Demo mode is %s. Switching to demo mode.', demo_mode);
    demo_mode_ = true;

    // Set the demo mode to run the latent constraints experiment as well.
    latent_mode_ = true;
    experiment_name_ = 'latent_constraints';
  }

  if (latent_experiment) {
    console.log('In latent constraints experiment mode');
    latent_mode_ = true;
    experiment_name_ = 'latent_constraints';
  }

  if (scribble_mode) {
    experiment_name_ = 'initial_scribble';
  }

  var video_button = document.getElementById('video-capture');
  var sample_img = document.getElementById('sample-img');
  var experiment_button = document.getElementById('experiment-button');
  var object_button = document.getElementById('detect-objects');

  // elements for the popup dialog and its actions
  var dialog = document.getElementById('image-select-modal');
  var closeButton = document.getElementById('file-dialog-cancel');
  var showButton = document.getElementById('show-image-select-modal');

  console.log('video_button', video_button);
  var epid = document.getElementById('experiment-epid');
  if (epid) {
    epid.value = current_episode_;
  }

  if (get_webcam) {
    console.log('Trying to access webcam');
    if (hasGetUserMedia_()) {
      navigator.getUserMedia(
          {video: true}, videoSuccessCallback_, videoErrorCallback_);
    } else {
      showMessage('Uh oh! Cannot access webcam');
    }
  }

  if (video_button) {
    console.log('Adding event listener for click on video button');
    video_button.addEventListener('click', clickNext_);
  }

  if (object_button) {
    object_button.addEventListener('click', detectObjectsInWebcam_);
  }

  if (sample_img) {
    sample_img.addEventListener('load', continuouslyRecordFace_);
  }

  if (experiment_button) {
    experiment_mode_ = true;
    experiment_button.addEventListener('click', runExperiment_);
  }

  // bind events for the popup dialog
  if (showButton) {
    showButton.addEventListener('click', showClickHandler_);
  }
  if (closeButton) {
    closeButton.addEventListener('click', closeClickHandler_);
  }
  if (dialog) {
    dialog.addEventListener('click', imageClickHandler_);
  }

  populateImages();
};


/**
 * Populates database with test svgs.
 */
function populateImages() {
  gapi.client.load('affective', 'v1', function() {
    gapi.client.affective.populate_images({}).execute(function(resp) {
      console.log('Test svgs created.');
    });
  }, ROOT);
}
