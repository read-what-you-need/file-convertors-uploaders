require("dotenv").config({ path: ".env" });
const fs = require("fs");
var path = require("path");
const AWS = require("aws-sdk");
const rmdir = require("rimraf");

// bring kafka workers
const kafkaService = require("./services/kafka");
const { kafkaProducer } = require("./libs/kafkaConnector");
const { kafkaConsumer } = require("./libs/kafkaConnector");
const { FILE_JOB_SUBMIT } = require("./libs/kafkaTopics");

const { getPage, getDownloadLinksFromPage, fileConvertorPromiseWrapper, resilientDownloader } = require("./services/fileHandlers");
const {
  pingGateway,
  convertTimeGauge,
  downloadTimeGauge,
  connectionStatusGauge,
  downloadsFailedCounter,
  downloadsFinishedCounter,
  downloadsTotalCounter
} = require("./libs/prometheus");
const { getRandomInt } = require("./services/helpers");
// instantiate s3 object
let s3 = new AWS.S3();
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function connectKafkaProducer() {
  try {
    await kafkaProducer.connect().then(() => {
      console.log("kafka producer is connected.");
    });
  } catch (error) {
    console.error(`Could not connect to kafka`);
    connectionStatusGauge.labels({ status: "Disconnected" }).set(0);
    pingGateway();
  }
}

async function startPipeline(md5) {
  let fileExtension = null;
  let outputPath = `./files/${md5}/`;
  let outputFile = outputPath + "file.txt";
  let downloadTimeMetric;
  let conversionTimeMetric;
  downloadsTotalCounter.inc(1);
  pingGateway();
  fs.mkdir(outputPath, { recursive: true }, err => {
    if (err) throw err;
  });
  getPage(md5)
    .then(pageHtml => {
      let links = getDownloadLinksFromPage(pageHtml);
      return links;
    })
    .then(links => {
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Downloading file into our systems." });
      downloadTimeMetric = downloadTimeGauge.startTimer();
      let fileUrl = links[1];
      fileExtension = path.extname(fileUrl);
      return resilientDownloader({ links, fileId: md5 });
    })
    .then(_file => {
      let options = { input: path.join(__dirname, outputPath + "file" + fileExtension), output: path.join(__dirname, outputFile) };
      downloadTimeMetric();
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Launching convertors for file!" });
      pingGateway();
      conversionTimeMetric = convertTimeGauge.startTimer();
      return fileConvertorPromiseWrapper(options);
    })
    .then(_response => {
      conversionTimeMetric();
      pingGateway();
      console.log(`file successfully converted`);
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Conversion successfully executed." });
      const fileContent = fs.createReadStream(outputFile);
      console.log(`uploading to storage`);
      return new Promise(function (resolve, reject) {
        fileContent.once("error", reject);
        s3.upload({ Bucket: process.env.AWS_BUCKET_NAME, Key: `v2/${md5}/file.txt`, Body: fileContent }, function (err, result) {
          if (err) {
            reject(err);
            return;
          }
          resolve(result.Location);
        });
      });
    })
    .then(() => {
      console.log("uploaded successful ");
      return kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "File downloaded into system." });
    })
    .then(() => {
      console.log("successfully updated status to kafka");
      return kafkaService.addToProcessTopic({ fileId: md5 });
    })
    .then(() => {
      console.log("successfully pinged kafka");
      rmdir(outputPath, function () {
        console.log("cleaning file");
      });
      downloadsFinishedCounter.inc();
      pingGateway();
    })
    .catch(err => {
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Faced error while downloading file into system." });
      kafkaService.addToFileFailQueue({ fileId: md5, error: err });
      downloadsFailedCounter.inc(1);
      console.error("Faced error", err);
      pingGateway();
    });
}

const kakfkaConsumerStart = async () => {
  let fileSubmittedConsumer = kafkaConsumer({ groupId: "node-server-kafka-file-submitted-consumers" });

  await fileSubmittedConsumer.connect();
  await fileSubmittedConsumer.subscribe({ topic: FILE_JOB_SUBMIT, fromBeginning: false });
  setInterval(() => {
    connectionStatusGauge.labels({ status: "Active" }).set(getRandomInt(8, 16));
    pingGateway();
  }, 5000);
  fileSubmittedConsumer
    .run({
      autoCommitThreshold: 1,
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received message in topic: ${topic}:${partition}:${message.offset}:${message.timestamp} ${message.key}#${message.value}`);
        let fileId;
        try {
          fileId = message.value.toString("utf-8");
          if (fileId) {
            startPipeline(fileId);
          } else {
            console.error(`file id not present`);
          }
        } catch (err) {
          console.error(`Valid file id not passed.`);
        }
      }
    })
    .then(console.log("fileSubmittedConsumer running .."))
    .catch(e => {
      console.error(`error: [producer/fileSubmittedConsumer] ${e.message}`, e);
    });
};
const main = async () => {
  connectKafkaProducer();
  kakfkaConsumerStart();
};

main();
