#!/bin/bash

source ~/.bash_profile

#export PATH="$HOME/google-cloud-sdk/bin:$PATH"
export PROJECT="affectivecomputing-188820"
python lib/endpoints/endpointscfg.py get_openapi_spec main.AffectiveApi --hostname $PROJECT.appspot.com
gcloud endpoints services deploy affectivev1openapi.json
gcloud endpoints configs list --service=$PROJECT.appspot.com
echo "Update the endpoint version in app.yaml based on this call"
