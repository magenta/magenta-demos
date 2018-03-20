# Server code

## Setup

Here is a [view of the API](https://apis-explorer.appspot.com/apis-explorer/?base=https://affectivecomputing-188820.appspot.com/_ah/api#p/affective/v1/echo.echo?n=18&fields=content&_h=5&resource=%257B%250A++%2522content%2522%253A+%2522mooka%2522%250A%257D&)

## Install necessary software

```
pip install --upgrade google-cloud
pip install --upgrade google-api-python-client
pip install --upgrade appengine-sdk
pip install -t lib -r requirements.txt --ignore-installed --upgrade

```

## Rebuild and deploy endpoints

```
export PROJECT="affectivecomputing-188820"
python lib/endpoints/endpointscfg.py get_openapi_spec main.AffectiveApi \
   --hostname $PROJECT.appspot.com
gcloud endpoints services deploy affectivev1openapi.json
gcloud endpoints configs list --service=$PROJECT.appspot.com
echo "Update the endpoint version in app.yaml based on this call"
gcloud app deploy
```
