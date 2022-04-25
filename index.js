require("dotenv").config({ path: ".env" });
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const url = require("url");
var path = require("path");
const AWS = require("aws-sdk");

const fileConvertor = require("ebook-convert");

// bring kafka workers
const kafkaService = require("./services/kafka");
const { kafkaProducer } = require("./libs/kafkaConnector");
const { kafkaConsumer } = require("./libs/kafkaConnector");
const { FILE_JOB_SUBMIT } = require("./libs/kafkaTopics");

// instantiate s3 object
let s3 = new AWS.S3();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function connectKafkaProducer() {
  await kafkaProducer.connect().then(() => {
    console.log("kafka producer is connected.");
  });
}

async function getPage(identifier) {
  let url = process.env.DOWNLOAD_STORE + identifier;
  console.log("obtaining page source");
  return axios.get(url).then(function (response) {
    return response.data;
  });
}

function getDownloadLinksFromPage(html) {
  let links = [];
  const $ = cheerio.load(html);
  $("#download a[href]").each((_index, elem) => {
    let link = $(elem).attr("href");
    links.push(link);
  });
  return links;
}

async function fileConvertorPromiseWrapper(options) {
  console.log(`converting file`);
  return new Promise((resolve, reject) => {
    fileConvertor(options, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

async function downloadFile({ fileUrl, downloadFilePath }) {
  const file = fs.createWriteStream(downloadFilePath);
  console.log(`file download started`);
  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream"
  }).then(response => {
    return new Promise((resolve, reject) => {
      response.data.pipe(file);
      let error = null;
      file.on("error", err => {
        error = err;
        file.close();
        reject(err);
      });
      file.on("close", () => {
        if (!error) {
          console.log(`file download complete`);
          resolve(true);
        }
      });
    });
  });
}

async function startPipeline(md5) {
  let fileName = null;
  let fileExtension = null;
  let outputPath = `./files/${md5}/`;
  let outputFile = outputPath + "file.txt";
  fs.mkdir(outputPath, { recursive: true }, err => {
    if (err) throw err;
  });
  getPage(md5)
    .then(pageHtml => {
      let links = getDownloadLinksFromPage(pageHtml);
      return links;
    })
    .then(links => {
      let fileUrl = links[1];
      let urlQuery = url.parse(fileUrl, true).query;
      fileName = urlQuery.filename;
      fileExtension = path.extname(fileUrl);
      let downloadFilePath = outputPath + "file" + fileExtension;
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Downloading file into our systems." });
      return downloadFile({ fileUrl, downloadFilePath });
    })
    .then(_file => {
      let options = { input: path.join(__dirname, outputPath + "file" + fileExtension), output: path.join(__dirname, outputFile) };
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Launching convertors for file!" });
      return fileConvertorPromiseWrapper(options);
    })
    .then(_response => {
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
      fs.rmSync(outputPath, { recursive: true, force: true }, () => console.log("cleaning files"));
    })
    .catch(err => {
      kafkaService.fileStatusUpdateSender({ fileId: md5, fileStatus: "Faced error while downloading file into system." });
      kafkaService.addToFileFailQueue({ fileId: md5, error: err });
    });
}

const kakfkaConsumerStart = async () => {
  let fileSubmittedConsumer = kafkaConsumer({ groupId: "node-server-kafka-file-submitted-consumers" });

  await fileSubmittedConsumer.connect();
  await fileSubmittedConsumer.subscribe({ topic: FILE_JOB_SUBMIT, fromBeginning: false });

  await fileSubmittedConsumer
    .run({
      autoCommitThreshold: 1,
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received message in topic: ${topic}:${partition}:${message.offset}:${message.timestamp} ${message.key}#${message.value}`);
        const fileId = message.value.toString("utf-8");
        startPipeline(fileId);
      }
    })
    .then(console.log("fileSubmittedConsumer running .."))
    .catch(e => console.error(`[producer/fileSubmittedConsumer] ${e.message}`, e));
};

connectKafkaProducer();
kakfkaConsumerStart();
