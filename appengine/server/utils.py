"""General utility functions for manipulating emotion metrics data.
"""

import logging

_LOG = logging.getLogger('affective_reward.webapp.feelnet')


def get_emotion_dict(emo_metrics):
  """Returns a dictionary in which keys are emotions and values are confidences.

  Args:
    emo_metrics: A list of dictionaries, which each have the keys 'name' and
      'confidence', describing emotions detected from FeelNet.
  Returns:
    A dictionary as described above.
  """
  emo_dict = {}
  for metric in emo_metrics:
    emo_dict[metric['name']] = metric['confidence']
  return emo_dict


def convert_emotion_metric_entity_to_dict(e_metric):
  """Convert a datastore EmotionMetric entity into a dictionary.

  Args:
    e_metric: an EmotionMetric datastore entity.

  Returns:
    A dictionary with keys as emotions and values are confidences
  """
  e_dict = {}
  e_dict['amusement'] = e_metric.amusement
  e_dict['anger'] = e_metric.anger
  e_dict['concentration'] = e_metric.concentration
  e_dict['contentment'] = e_metric.contentment
  e_dict['desire'] = e_metric.desire
  e_dict['disappointment'] = e_metric.disappointment
  e_dict['elation'] = e_metric.elation
  e_dict['disgust'] = e_metric.disgust
  e_dict['embarrassment'] = e_metric.embarrassment
  e_dict['interest'] = e_metric.interest
  e_dict['pride'] = e_metric.pride
  e_dict['sadness'] = e_metric.sadness
  e_dict['surprise'] = e_metric.surprise
  e_dict['time_since_sample_displayed'] = e_metric.time_since_sample_displayed
  e_dict['experiment_name'] = e_metric.experiment_name
  e_dict['experiment_description'] = e_metric.experiment_description
  e_dict['ID'] = e_metric.key.id()
  return e_dict


def get_example_emotion_dict():
  """Get an example emotion dictionary for use in testing.

  Returns:
    A dictionary with keys as emotions and values are confidences
  """
  e_dict = {}
  e_dict['amusement'] = 1.0
  e_dict['anger'] = 0.0
  e_dict['concentration'] = 0.0
  e_dict['contentment'] = 0.8
  e_dict['desire'] = 0.0
  e_dict['disappointment'] = 0.2
  e_dict['elation'] = 0.5
  e_dict['disgust'] = 0.1
  e_dict['embarrassment'] = 0.2
  e_dict['interest'] = 0.3
  e_dict['pride'] = 0.2
  e_dict['sadness'] = 0.1
  e_dict['surprise'] = 0.4
  e_dict['time_since_sample_displayed'] = 0
  e_dict['experiment_name'] = 'test_data'
  e_dict['experiment_description'] = 'Fake data, do not use.'
  return e_dict
