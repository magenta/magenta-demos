"""Main entry module specified in app.yaml.

This module contains the request handler codes and the main app.
"""

import logging
import re
import db_interface
import emotion
import endpoints
from protorpc import message_types
from protorpc import messages
from protorpc import remote

logging.basicConfig()
logger = logging.getLogger('logger')


class EmotionDetectorRequest(messages.Message):
  image = messages.StringField(1)
  user_id = messages.IntegerField(2)
  svg_id = messages.IntegerField(3)
  episode = messages.IntegerField(4)
  time_elapsed = messages.IntegerField(5)  # milliseconds
  experiment_name = messages.StringField(6)
  experiment_description = messages.StringField(7)


class EmotionMetric(messages.Message):
  name = messages.StringField(1)
  confidence = messages.FloatField(2)


class EmotionDetectorResponse(messages.Message):
  emotion_metrics = messages.MessageField(EmotionMetric, 1, repeated=True)
  episode = messages.IntegerField(2)
  face_count = messages.IntegerField(3)


class GetSvgResponse(messages.Message):
  # Content is an Svg image encoded in a string.
  svg_image = messages.StringField(1)
  svg_id = messages.IntegerField(2)


class IncrementSketchViewCountRequest(messages.Message):
  svg_id = messages.IntegerField(1)


class IncrementSketchViewCountResponse(messages.Message):
  svg_id = messages.IntegerField(1)
  times_viewed = messages.IntegerField(2)


GET_SVG_RESOURCE = endpoints.ResourceContainer(
    message_types.VoidMessage,
    image_class=messages.StringField(1, default=None))


@endpoints.api(name='affective', version='v1', api_key_required=True)
class AffectiveApi(remote.Service):
  """Affective API endpoint service."""
  @endpoints.method(
      EmotionDetectorRequest,
      EmotionDetectorResponse,
      path='emotion_detector',
      http_method='POST',
      name='emotion_detector')

  def emotion_detector(self, request):
    """Call public cloud emotion detector."""
    # Request image comes in as a dataurl.
    image_data = re.sub('^data:image/jpeg;base64,', '', request.image)
    emotion_list = emotion.annotate_image(image_data)
    response = EmotionDetectorResponse()
    for (name, confidence) in emotion_list:
      response.emotion_metrics.append(
          EmotionMetric(name=name, confidence=confidence))

    response.face_count = 1 if emotion_list else 0
    response.episode = request.episode

    return response

  @endpoints.method(
      GET_SVG_RESOURCE,
      GetSvgResponse,
      path='get_svg',
      http_method='GET',
      name='get_svg')
  def get_svg(self, request):
    svg_model = db_interface.query_one_svg()
    svg_image = ''
    svg_id = 0
    if svg_model:
      svg_image = svg_model.svg_image
      svg_id = svg_model.key.id()
    return GetSvgResponse(svg_image=svg_image, svg_id=svg_id)

  @endpoints.method(
      message_types.VoidMessage,
      message_types.VoidMessage,
      path='populate_images',
      http_method='GET',
      name='populate_images')
  def populate_images(self, request):
    db_interface.add_example_image()
    return message_types.VoidMessage()

  @endpoints.method(
      IncrementSketchViewCountRequest,
      IncrementSketchViewCountResponse,
      path='increment_sketch_view_count',
      http_method='GET',
      name='increment_sketch_view_count')
  def increment_sketch_view_count(self, request):
    response = IncrementSketchViewCountResponse()
    if request.svg_id:
      response.svg_id = request.svg_id
      sample_model = db_interface.update_sketch_times_viewed(request.svg_id)
      if sample_model:
        response.times_viewed = sample_model.times_viewed,

    return response


api = endpoints.api_server([AffectiveApi])
