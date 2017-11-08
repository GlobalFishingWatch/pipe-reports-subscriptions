const environment = process.env.NODE_ENV || 'development';

module.exports = {
  environment: environment,

  pubsub: {
    reports: {
      topic: entry({
        key: 'PUBSUB_REPORTS_TOPIC',
        doc: 'Name of the topic where report requests should be pushed to.',
        required: true,
      }),
    },
  },

  datastore: {
    namespace: entry({
      key: 'DATASTORE_NAMESPACE',
      doc: 'Namespace to scope all datastore operations to. On development this should be set to something unique to the user, such as "andres--pelagos-api"',
      defaults: {test: 'test'},
      required: true,
    }),
  },

  storage: {
    defaultBucket: entry({
      key: 'STORAGE_DEFAULT_BUCKET',
      doc: 'Default bucket which contains the tiles.',
      defaults: {development: 'world-fishing-827'},
      required: true,
    }),

    tilesetsPath: entry({
      key: 'STORAGE_TILESETS_PATH',
      doc: 'Path from the bucket root to the tilesets.',
      defaults: {all: 'pelagos/data/tiles/benthos-pipeline'},
      required: true,
    }),
  },

  gcloud: {
    pubsub: {
      projectId: entry({
        key: 'GCLOUD_PROJECTID_PUBSUB',
        doc: 'Google cloud platform project id for the pubsub services.',
        defaults: {development: '', test: ''},
        required: true,
      }),

      keyFilename: entry({
        key: 'GCLOUD_KEY_FILENAME',
        doc: 'Location of the json key file for authorizing with the pubsub services',
        defaults: {development: '/opt/project/dev/key.json', test: '/opt/project/dev/key.json'},
        required: false,
      }),
    },

    datastore: {
      projectId: entry({
        key: 'GCLOUD_PROJECTID_DATASTORE',
        doc: 'Google cloud platform project id for the datastore services.',
        defaults: {development: 'world-fishing-827', test: 'world-fishing-827'},
        required: true,
      }),

      keyFilename: entry({
        key: 'GCLOUD_KEY_FILENAME',
        doc: 'Location of the json key file for authorizing with the datastore services',
        defaults: {development: '/opt/project/dev/key.json', test: '/opt/project/dev/key.json'},
        required: false,
      }),
    },
    storage: {
      projectId: entry({
        key: 'GCLOUD_PROJECTID_STORAGE',
        doc: 'Google cloud platform project id for the storage services.',
        defaults: {development: 'world-fishing-827', test: 'world-fishing-827'},
        required: true,
      }),

      keyFilename: entry({
        key: 'GCLOUD_KEY_FILENAME',
        doc: 'Location of the json key file for authorizing with the storage services',
        defaults: {development: '/opt/project/dev/key.json'},
        required: false,
      }),
    },
  },
};

function errorMessage(key, doc) {
  return `You need to configure the environment variable ${key}. ${doc}`;
}

function entry(options) {
  let value = process.env[options.key];

  if (value === undefined && options.defaults) {
    value = options.defaults[environment];
  }

  if (value === undefined && options.defaults) {
    value = options.defaults.all;
  }

  if (value === undefined && options.required) {
    throw errorMessage(options.key, options.doc);
  }

  return value;
}

