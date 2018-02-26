#!/bin/bash

# Install necessary software
pip install --upgrade google-cloud
pip install --upgrade google-api-python-client
pip install --upgrade appengine-sdk
pip install -t lib -r requirements.txt --ignore-installed --upgrade

# Rebuild and deploy endpoints
export PROJECT="my_appspot_project"
export API_KEY="A_valid_api_key"

python lib/endpoints/endpointscfg.py get_openapi_spec main.AffectiveApi --hostname $PROJECT.appspot.com
gcloud endpoints services deploy affectivev1openapi.json
gcloud endpoints configs list --service=$PROJECT.appspot.com
echo "Update the endpoint version in app.yaml based on this call"
gcloud app deploy

