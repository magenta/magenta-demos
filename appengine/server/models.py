"""Defines datastore database models.
"""
from google.appengine.ext import ndb

_DEFAULT_FETCH_SIZE = 128


class EmotionMetrics(ndb.Model):
  """Stores one instance of detected emotions from the user.

  Properties:
    user_id: An integer hashed / anonymized user ID.
    episode_id: An int describing the number of trials the user has experienced
      before this one.
    sample_id: An int ID of the sample that was viewed.
    timestamp: Time entity was created.
    time_elapsed: The time in milliseconds from when the sample was displayed
      to when the recording was made.
    experiment_name: The name of the experiment (indexed/searchable).
    experiment_description: Long form text describing the experiment.
    joy, sorrow, surprise, anger: Float confidences/intensities of detected
    emotions.
  """
  user_id = ndb.IntegerProperty()
  episode_id = ndb.IntegerProperty()
  sample_id = ndb.IntegerProperty()
  timestamp = ndb.DateTimeProperty(auto_now_add=True)
  time_since_sample_displayed = ndb.FloatProperty()

  experiment_name = ndb.StringProperty()
  experiment_description = ndb.TextProperty()

  joy = ndb.FloatProperty()
  sorrow = ndb.FloatProperty()
  surprise = ndb.FloatProperty()
  anger = ndb.FloatProperty()

  @classmethod
  def CreateAndStore(cls,
                     user_id,
                     episode_id,
                     sample_id,
                     joy,
                     sorrow,
                     surprise,
                     anger,
                     time_elapsed,
                     experiment_name='',
                     experiment_description=''):
    """Creates and stores an EmotionMetrics entity for this user and sample.

    Args:
      user_id: An integer hashed / anonymized user ID.
      episode_id: An int describing the number of trials the user has
        experienced before this one.
      sample_id: An int ID of the sample that was viewed.
      joy: Float confidences/intensities of detected emotions.
      sorrow: Float confidences/intensities of detected emotions.
      surprise: Float confidences/intensities of detected emotions.
      anger: Float confidences/intensities of detected emotions.
      time_elapsed: The time in milliseconds from when the sample was displayed
        to when the recording was made.
      experiment_name: The name of the experiment (indexed/searchable).
      experiment_description: Long form text describing the experiment.

    Returns:
      Created and stored Woof entity.
    """
    emo_metrics = cls(
        user_id=user_id,
        episode_id=episode_id,
        sample_id=sample_id,
        joy=joy,
        sorrow=sorrow,
        surprise=surprise,
        anger=anger,
        time_since_sample_displayed=time_elapsed,
        experiment_name=experiment_name,
        experiment_description=experiment_description)
    emo_metrics.put()
    return emo_metrics

  @classmethod
  def Get(cls,
          episode_id=None,
          sample_id=None,
          user_id=None,
          experiment_name=None,
          count=_DEFAULT_FETCH_SIZE):
    """Returns list of EmotionMetrics models ordered by most recent first.

    Args:
      episode_id: An int describing the number of trials the user has
        experienced before this one.
      sample_id: An int ID of the sample that was viewed.
      user_id: An integer hashed / anonymized user ID.
      experiment_name: String name of the experiment desired.
      count: An integer limiting the number of responses returned.
    Returns:
      A list of EmotionMetrics models.
    """
    query = cls.query().order(-cls.timestamp)
    if episode_id:
      # ndb query objects are immutable. filter and order calls do not apply to
      # existing object, but create a new query object.
      query = query.filter(cls.episode_id == episode_id)
    if sample_id:
      query = query.filter(cls.sample_id == sample_id)
    if user_id:
      query = query.filter(cls.user_id == user_id)
    if experiment_name:
      query = query.filter(cls.experiment_name == experiment_name)
    results = query.fetch(limit=count)
    return results


class SketchImage(ndb.Model):
  """Stores a sample sketch image in SVG format.

  Properties:
    image_class: A string image class like 'cat'.
    model_description: A string description of the model that created the sketch
      like 'real_data' or 'vanilla_sketch_rnn'.
    times_created: Time entity was created.
    times_viewed: An integer for the number of times EmotionMetrics data has
      been collected from this sketch.
    svg_image: The contents of the image in SVG format.
  """
  image_class = ndb.StringProperty()
  model_description = ndb.StringProperty()
  time_created = ndb.DateTimeProperty(auto_now_add=True)
  times_viewed = ndb.IntegerProperty(default=0)
  svg_image = ndb.BlobProperty()

  @classmethod
  def CreateAndStore(cls, image_class, svg_image, model_description=''):
    """Creates and stores a DB model for the sample sketch.

    Args:
      image_class: A string image class like 'cat'.
      svg_image: The contents of the image in SVG format.
      model_description: A string description of the model that created the
        sketch like 'real_data' or 'vanilla_sketch_rnn'.
    Returns:
      The SketchImage model instance.
    """
    img = cls(
        svg_image=svg_image,
        image_class=image_class,
        model_description=model_description)
    img.put()
    return img

  @classmethod
  def Get(cls, image_class=None, model_description=None, count=1):
    """Returns list of SketchImage models ordered by recency and times viewed.

    Args:
      image_class: A string image class like 'cat'.
      model_description: A string description of the model that created the
        sketch like 'real_data' or 'vanilla_sketch_rnn'.
      count: An integer limiting the number of responses returned.
    Returns:
      List of SketchImage model entities.
    """
    query = cls.query().order(cls.times_viewed).order(-cls.time_created)
    if image_class:
      query = query.filter(cls.image_class == image_class)
    if model_description:
      query = query.filter(cls.model_description == model_description)
    results = query.fetch(limit=count)
    return results
