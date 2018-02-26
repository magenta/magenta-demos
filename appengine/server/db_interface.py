"""Converting data into a format that can be stored in the DB, and querying DB.
"""

import logging
import models

_LOG = logging


def store_emotion_metrics(emo_dict,
                          episode_id,
                          sample_id,
                          user_id,
                          time_elapsed,
                          experiment_name='',
                          experiment_description=''):
  """Stores attributes into a DB EmotionMetrics object.

  Args:
    emo_dict: A dictionary with emotions as keys and intensities as values.
    episode_id: An int describing the number of trials the user has experienced
      before this one.
    sample_id: An int ID of the sample that was viewed.
    user_id: An integer hashed / anonymized user ID.
    time_elapsed: The time in milliseconds from when the sample was displayed
      to when the recording was made.
    experiment_name: The name of the experiment (searchable).
    experiment_description: Long form text describing the experiment.

  Returns:
    The EmotionMetrics db object created.
  """
  _LOG.debug('In DB interface. User ID is:\n%s', user_id)

  emo_model = models.EmotionMetrics.CreateAndStore(
      int(user_id),
      episode_id,
      int(sample_id),
      joy=emo_dict['joy'],
      sorrow=emo_dict['sorrow'],
      surprise=emo_dict['surprise'],
      anger=emo_dict['anger'],
      time_elapsed=time_elapsed,
      experiment_name=experiment_name,
      experiment_description=experiment_description)
  _LOG.debug('Wrote metrics to db interface, got back model obj:%s', emo_model)
  return emo_model


def query_emotion_metrics(episode_id=None,
                          sample_id=None,
                          user_id=None,
                          experiment_name=None,
                          count=128):
  """Queries the stored emotion metrics based on some criteria.

  Args:
    episode_id: An int describing the number of trials the user has experienced
      before this one.
    sample_id: An int ID of the sample that was viewed.
    user_id: An integer hashed / anonymized user ID.
    experiment_name: A searchable string name of the experiment to query.
    count: An integer limiting the number of responses returned.
  Returns:
    A list of DB entities matching the query.
  """
  return models.EmotionMetrics.Get(
      episode_id=episode_id,
      sample_id=sample_id,
      user_id=user_id,
      count=count,
      experiment_name=experiment_name)


def query_one_svg(image_class=None, model_description=None):
  """Get a single sample sketch based on some requirements.

  Args:
    image_class: A string image class like 'cat'.
    model_description: A string description of the model that created the sketch
      like 'real_data' or 'vanilla_sketch_rnn'.
  Returns:
    The first image model returned by the query, prioritizing recently created
    images that have never been viewed.
  """
  results = models.SketchImage.Get(
      image_class=image_class, model_description=model_description, count=1)
  if results:
    return results[0]
  else:
    _LOG.debug('No images to display! using example')
    return None


def update_sketch_times_viewed(svg_id):
  """Increment the number of times a sketch model has been viewed based on key.

  Args:
    svg_id: An integer key of the sketch instance.
  """
  try:
    sketch_model = models.SketchImage.get_by_id(int(svg_id))

    sketch_model.times_viewed += 1
    sketch_model.put()
    _LOG.info('Updated sketch of class %s so that the times viewed are now %i',
              sketch_model.image_class, sketch_model.times_viewed)
  except:  # pylint: disable=bare-except
    _LOG.error('Such a sketch does not exist.')


def add_example_image():
  """Populates the DB with example sketches for debugging purposes."""
  example_svg1 = """<svg baseProfile="full" height="72.9483836" version="1.1"
                     width="76.45813535" xmlns="http://www.w3.org/2000/svg"
                     xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xlink=
                     "http://www.w3.org/1999/xlink">
                       <defs />
                       <rect fill="white" height="72.9483836" 
                         width="76.45813535" x="0" y="0" />
                       <path d="M41.46883855,30.1296385 m-0.539962,-1.34990485
                         l-3.2397717,-2.9697907 -1.61988585,-0.80994295 
                         l-1.34990485, 0.0 -4.31969585,2.9697907 l-2.4298288,
                         2.9697907 -1.34990485, 3.2397717 l0.0,2.1598479 
                         2.69980965,2.1598479 l1.34990485, -2.9697907 2.9697907,
                         -0.539962 l2.1598479,1.07992395 -0.269981,2.9697907 
                         l-0.80994295,0.539962 -2.69980965, -1.34990485 
                         l-0.539962,3.2397717 0.0,1.07992395 l3.7797338, 
                         2.9697907 0.80994295,0.0 l0.80994295,-0.80994295 
                         1.8898669, -0.80994295 l1.34990485,-1.61988585 
                         3.2397717,-1.34990485 l0.80994295,-1.34990485 0.0,
                         -2.9697907 m-6.47954345, -5.66960035 l13.76903055,
                         -1.07992395 0.0,1.61988585 l-3.2397717,1.34990485 
                         -6.74952445,0.0 l-0.80994295,0.539962 -2.69980965,
                         -0.269981 l-0.80994295,-2.1598479 m5.1296389, 
                         1.34990485 l0.80994295,4.31969585 m-14.8489535,
                         1.07992395 l-1.34990485,0.80994295 -1.34990485,
                         2.69980965 l-0.269981, 4.31969585 1.07992395,
                         1.07992395 l1.8898669,1.34990485 3.2397717,-0.539962 
                         l2.4298288,-2.1598479 1.07992395, -1.8898669 
                         m-1.8898669,-7.8294486 l-0.80994295,0.269981 -0.539962,
                         1.34990485 l1.61988585,0.80994295 -0.539962, 
                         -1.61988585 m-7.8294486,7.0195055 l1.34990485,0.269981 
                         0.80994295,2.9697907 m0.80994295,0.269981 l0.539962,
                         -0.269981 1.07992395,-3.50975275 " 
                         fill="none" stroke="black" stroke-width="1" />
                   </svg>"""
  models.SketchImage.CreateAndStore('sheep', example_svg1, 'real_data')

  example_svg2 = """<svg baseProfile="full" height="89.7860519961" version="1.1"
                     width="81.3535671681" xmlns="http://www.w3.org/2000/svg" 
                     xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xlink=
                     "http://www.w3.org/1999/xlink">
                     <defs />
                     <rect fill="white" 
                      height="89.7860519961" width="81.3535671681" x="0" y="0" />
                     <path d="M42.780221384,41.0375479609 m-0.18783768639,
                       0.284642782062 l0.49078039825,0.0642426125705 
                       2.97580003738, -1.29088550806 l1.80954962969,
                       -1.25172927976 3.030859828, -2.49409869313 
                       l1.03990338743,-1.3538274169 m-9.51056182384, 
                       -8.39351832867 l-1.98799192905,-1.12117990851 
                       -2.59159833193, -0.481194220483 l-4.47818756104,
                       0.506501384079 -3.3384719491, 1.79597198963 
                       l-2.28633850813,2.49610707164 -1.61897614598,
                       3.25579106808 l-0.963274016976,4.11304652691 
                       -0.163876712322, 7.38291323185 l1.13014027476,
                       5.62448561192 1.94352343678, 4.6634849906 
                       l2.55642831326,3.75703424215 5.14161765575,
                       4.47943687439 l7.67184793949,1.71127900481 3.43294501305,
                       -0.787669792771 l3.55121046305,-2.13624045253 
                       3.0993783474, -3.26823979616 l2.15240001678,
                       -4.36274886131 0.674075707793, -19.6352362633 
                       l-5.75577378273,-9.24406468868 m-8.31704735756,
                       8.59957456589 l0.557273812592,-0.847678259015 
                       1.65358513594, -0.566031634808 l2.02725678682,
                       -0.000221293430513 1.80379614234,0.887928307056 
                       l0.76907299459,0.970411971211 0.461218357086,
                       1.97749853134 l-0.325850211084,0.844492539763 
                       -1.87801018357,0.902311876416 l-3.67191970348,
                       0.199257638305 -1.74951627851,-1.94851785898 
                       l-0.343359038234,-2.53376036882 m-8.74572515488,
                       1.80951938033 l-0.622929893434,-0.913138315082 
                       -1.88116624951,-1.35415181518 l-1.19218565524,
                       -0.357586704195 -1.63348555565,0.433886274695 
                       l-0.931676179171,2.11396574974 0.42377255857,
                       1.9692453742 l1.4306640625,0.743100866675 4.43917900324,
                       0.0559238251299 l0.984945818782,-1.45126774907 
                       0.151667417958,-1.98847949505 m0.313824974,2.88371771574 
                       l0.000462826974399,-0.000654117175145 m10.4860162735,
                       -2.15939834714 l-1.24286003411,-1.78383305669 
                       -0.55390316993, -1.80988907814 l0.289762914181,
                       -1.79335713387 " fill="none" stroke="black" 
                       stroke-width="1" />
                 </svg>"""
  models.SketchImage.CreateAndStore('face', example_svg2,
                                    'vanilla_sketch_rnn_cns_midtraining')

  _LOG.debug('Wrote example images into the db')
