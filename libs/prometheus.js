// monitoring set up
const promClient = require("prom-client");
const Registry = promClient.Registry;
const register = new Registry();
const gateway = new promClient.Pushgateway(process.env.PUSH_GATEWAY_ENDPOINT, [], register);
const prefix = process.env.APP_NAME;

const downloadTimeGauge = new promClient.Gauge({
  name: `${prefix}_download_time`,
  help: `${prefix}_download_time`,
  labelNames: ["download_time_metrics"],
  registers: [register]
});
const convertTimeGauge = new promClient.Gauge({
  name: `${prefix}_convert_time`,
  help: `${prefix}_convert_time`,
  labelNames: ["convert_time_metrics"],
  registers: [register]
});
const connectionStatusGauge = new promClient.Gauge({
  name: `${prefix}_connection_status`,
  help: `${prefix}_connection_status`,
  labelNames: ["status"],
  registers: [register]
});

const downloadsTotalCounter = new promClient.Counter({
  name: `${prefix}_download_total_requests_count`,
  help: `${prefix}_download_total_requests`,
  registers: [register]
});

const downloadsFailedCounter = new promClient.Counter({
  name: `${prefix}_download_failed_requests_count`,
  help: `${prefix}_download_failed_requests_count`,
  registers: [register]
});

const downloadsFinishedCounter = new promClient.Counter({
  name: `${prefix}_download_finished_requests_count`,
  help: `${prefix}_download_finished_requests_count`,
  registers: [register]
});

const pingGateway = async () => {
  gateway
    .push({ jobName: prefix })
    .then(({ resp, body }) => {
      console.log(`Body: ${body}: Response status for: ${resp.statusCode}`);
    })
    .catch(err => {
      console.log(`Error: ${err}`);
    });
};

module.exports = {
  pingGateway,
  convertTimeGauge,
  downloadTimeGauge,
  downloadsTotalCounter,
  downloadsFailedCounter,
  downloadsFinishedCounter,
  connectionStatusGauge
};
