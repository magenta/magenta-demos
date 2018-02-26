"""A simple Flask example app with little error handling or documentation."""

import logging

from flask import Flask
from flask import render_template
from google.appengine.api import users

app = Flask(__name__)


@app.route('/')
@app.route('/index')
def index():
  """Serves home.html."""
  template_values = {}
  user = users.get_current_user()
  nickname = user.nickname() if user else ''
  user_id = hash(str(user.user_id())) if user else ''

  template_values['nickname'] = nickname
  template_values['user'] = user
  template_values['user_id'] = user_id
  template_values['show_post_form'] = False
  template_values['get_webcam'] = True
  template_values['static_dir'] = '/static'

  return render_template('home.html', **template_values)


if __name__ == '__main__':
  app.run(port=8090, debug=True)


@app.errorhandler(500)
def server_error(unused_e):
  """Log the error and stacktrace."""
  logging.exception('An error occurred during a request.')
  return 'An internal error occurred.', 500
