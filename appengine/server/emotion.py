"""Sample emotion detector built from the public Google vision API.

This code stores no personally identifiable information and our intent is that
no derived code will do so.
"""

from googleapiclient.discovery import build

# TODO(douglaseck): Refector to use valid key and hide it properly.
API_KEY = 'Akey'

def build_json(image_content):
  """Builds a json string containing response from vision api."""
  json_data = {
      'requests': [{
          'image': {
              'content': image_content
          },
          'features': [{
              'type': 'FACE_DETECTION',
              'maxResults': 1,
          }]
      }]
  }
  return json_data


LIKELIHOOD_LABELS = [
    u'joyLikelihood', u'sorrowLikedlihood', u'surpriseLikelihood',
    u'angerLikelihood'
]
BIN_VALUES = {
    'UNKNOWN': 0.0,
    'VERY_UNLIKELY': -1.0,
    'UNLIKELY': -0.5,
    'POSSIBLE': 0.25,
    'LIKELY': 0.5,
    'VERY_LIKELY': 1.0
}


def emotion_likelihoods(response):
  """Returns list of tuples containing [name, likelihood] for all emotions."""
  emotion_list = []
  for image_annotation in response['responses']:
    if 'faceAnnotations' in image_annotation:
      # We only parse the first face annotation.
      for label, bin_name in image_annotation['faceAnnotations'][0].iteritems():
        if label in LIKELIHOOD_LABELS:
          name = label.replace('Likelihood', '')
          emotion_list.append([name, BIN_VALUES[bin_name]])
  return emotion_list


def annotate_image(image_content):
  json_data = build_json(image_content)
  service = build('vision', 'v1', developerKey=API_KEY)
  request = service.images().annotate(body=json_data)
  response = request.execute()
  return emotion_likelihoods(response)
