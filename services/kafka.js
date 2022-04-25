const { kafkaProducer } = require("../libs/kafkaConnector");
const { FILE_TO_PROCESS, FILE_STATUS_UPDATES, FILE_FAIL_QUEUE, FILE_JOB_SUBMIT } = require("../libs/kafkaTopics");

const fileStatusUpdateSender = async ({ fileId, fileStatus }) => {
  await kafkaProducer
    .send({
      topic: FILE_STATUS_UPDATES,
      messages: [{ key: fileId, value: `${fileStatus}` }]
    })
    .catch(e => {
      throw new Error(`[producer/fileStatusUpdateSender] ${e.message}: ${e.stack}`);
    });
};

const addToProcessTopic = async ({ fileId }) => {
  await kafkaProducer
    .send({
      topic: FILE_TO_PROCESS,
      messages: [{ key: fileId, value: `${fileId}` }]
    })
    .then(console.log("successful addToProcessTopic Kafka"))
    .catch(e => console.error(`[producer/addToProcessTopic] ${e.message}`, e));
};

const addToFileFailQueue = async ({ fileId, error }) => {
  await kafkaProducer
    .send({
      topic: FILE_FAIL_QUEUE,
      messages: [{ key: fileId, value: `${FILE_JOB_SUBMIT}`, headers: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } }]
    })
    .then(console.log("successful addToFileFailQueue Kafka"))
    .catch(e => console.error(`[producer/addToFileFailQueue] ${e.message}`, e));
};

module.exports = { fileStatusUpdateSender, addToProcessTopic, addToFileFailQueue };
