# DART V2 Frontend

For iteration two of the DART frontend we're going to leverage Apache Superset with custom plugins to meet our specific data visualization needs.

More to come!


# Forked from Apache/Superset

This has been forked from [Apache/Superset](https://github.com/apache/superset) in the following manner:

```
git clone --branch master --single-branch --no-tags https://github.com/apache/superset.git
cd superset
git fetch origin refs/tags/4.0.2:refs/tags/4.0.2 --no-tags
```

Create GitLab project, and get project URL: https://gitlab.management.acf.gov/systems/dart/dart-superset-fork.git

```
git remote set-url origin https://gitlab.management.acf.gov/systems/dart/dart-superset-fork.git
git push -u origin master
git push origin 4.0.2
```

Configure to be able to pull Apache/Superset updates into the fork:
```
git remote add github https://github.com/apache/superset.git
git remove -v

# Pull Apache Superset updates with this command
git pull github master
```

To view a summary of DART changes, compare against the base tag used!
```
git diff --name-only 4.0.2
git diff 4.0.2
```

## Apply Formatting and Linting Rules

Iterate the below as each change format of each other...
```
ruff check .
ruff check . --add-noqa # This will ignore baseline issues with Superset

# Can order both sort imports and format:
ruff check --select I --fix .
ruff format .

black --check .
black .

isort --check-only .
isort .
```

```
cd ./superset-frontend/
npm upgrade
```


# Creating a Plugin!

Use the publicly available yeoman template to generate a new plugin:

```
git clone https://github.com/apache/superset.git

npm i -g yo
cd superset-frontend/packages/generator-superset
npm i
npm link

mkdir /plugins/hello-dart
cd /plugins/hello-dart
yo @superset-ui/superset

npm ci
npm run build
```

*IMPORTANT:* In your package.json, be sure the name has the prefix `@superset-ui/` as this is used to symlink during webpack build process.

## Plugin Structure
![Plugin Structure](plugin-structure.png)

`src/types.ts`: the types that your plugin uses

`src/HelloDart.tsx` the actual plugin code

`src/plugin/buildQuery.ts`: the hook that creates the chart data request payload. Usually you can leave this unchanged and start customizing it later as your plugin becomes more complex.

`src/plugin/transformProps.ts`: the hook that receives data from the backend and returns that final data that's passed to the plugin (in this example HelloDart.tsx)

## Adding to Superset

Wire this plugin into Superset by making the node package available, and editing superset-frontend/src/visualizations/presets/MainPreset.js as below:

```
import { HelloDart } from '@superset-ui/hello-dart';

new HelloDart().configure({ key: 'ext_hello_dart' }),
```

### Creating Node Packages

You can link a node package from your local file system like so:

`npm i -S /plugins/@superset-ui/hello-dart`

You can publish your npm package with [these instructions](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages).


### Notes

"The Chart Data Endpoint"

localhost:9000/swagger/v1
- can use to view all APIs in Superset

Abstraction on top of Query Object.

Data Wrangling
- transformProps.ts
- No caching - can be computationally expensive
- JS data processing not rich like python
- Network bottleneck due to moving raw data to frontend

- Chart data endpoint offers commonly needed data operations: pivot, aggregation, rolling agg, contribution, sort, geohash, etc.
- Only needs done once, subsequent calls hit cache.
- Multiple ops can be chained together: Super SQL!


