const config = require('./config');
const datastore = require('./services/datastore');
const pubsub = require('./services/pubsub');
const storage = require('./services/storage');
const log = require('winston');
const moment = require('moment');
const util = require('util');

log.level = 'debug';

const asyncTopic = pubsub
  .topic(config.pubsub.reports.topic)
  .get({autoCreate: true});

const recurrency2TimeUnit = {
  'daily': 'day',
  'weekly': 'week',
  'monthly': 'month',
};

const buildReportParams = (subscription) => {
  const to = subscription.nextReportTimestamp;
  const from = moment(to).subtract(1, recurrency2TimeUnit[subscription.recurrency]).toDate();
  return Object.assign({}, subscription.base.params, {
    from, to,
  });
};

const buildReportRequest = (subscription) => {
  return Object.assign({}, subscription.base, {
    timestamp: new Date(),
    recurrency: subscription.recurrency,
    params: buildReportParams(subscription),
  });
};

const enqueueReportForSubscription = async (subscription) => {
  const scopedLog = {
    debug(...args) {
      const id = subscription[datastore.KEY].path;
      log.debug(`[Subscription ${id}]`, ...args);
    },
  };

  scopedLog.debug("Enqueuing report request for subscription", subscription);

  scopedLog.debug("Checking if the tileset data is ready");
  const [tilesetConfigBuffer] = await storage
    .bucket(config.storage.defaultBucket)
    .file(`${config.storage.tilesetsPath}/${subscription.base.tileset}/config.json`)
    .download();

  const tilesetConfig = JSON.parse(tilesetConfigBuffer.toString('utf-8'));
  const tilesetDataEndDate = tilesetConfig.data_end_date;
  scopedLog.debug(`The tileset has data available up to ${tilesetDataEndDate}`);

  if (tilesetDataEndDate < subscription.nextReportTimestamp) {
    scopedLog.debug(`Data for dates up to ${subscription.nextReportTimestamp} is not available for this tileset`);
    return null;
  }

  scopedLog.debug(`The tileset has data available for dates up to ${subscription.nextReportTimestamp}`);

  const reportRequest = buildReportRequest(subscription);
  scopedLog.debug("Report request", reportRequest);

  scopedLog.debug("Awaiting for topic to be available");
  const [topic] = await asyncTopic;

  scopedLog.debug("Enqueuing report request");
  const messageId = await topic.publish(reportRequest);

  scopedLog.debug("Report request enqueued", {messageId});

  scopedLog.debug("Calculating next report timestamp from current", subscription.nextReportTimestamp);
  const nextReportTimestamp = moment(subscription.nextReportTimestamp)
    .clone()
    .add(2, 'second')
    .endOf(recurrency2TimeUnit[subscription.recurrency])
    .toDate();
  subscription.nextReportTimestamp = nextReportTimestamp;
  scopedLog.debug("Setting the next report timestamp", nextReportTimestamp);

  scopedLog.debug("Updating the subscription with the next report timestamp");
  const updateResult = await datastore.update(subscription);

  scopedLog.debug("Done with this subscription");
};

const main = async () => {
  log.debug("Checking report subscriptions");

  log.debug("Building report query");
  const query = datastore
    .createQuery("ReportSubscription")
    .filter('nextReportTimestamp', '<=', new Date());

  log.debug("Running active subscriptions query");
  const [activeSubscriptions, paginationInfo] = await query.run();

  log.debug("Pagination info", paginationInfo);
  log.debug("Active subscriptions", activeSubscriptions);
  await Promise.all(activeSubscriptions.map(enqueueReportForSubscription));

  log.debug("Done processing batch of subscriptions");
};

main();

