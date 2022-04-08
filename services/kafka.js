const { kafkaProducer} = require("../libs/kafkaConnector");
const { FILE_TO_PROCESS, FILE_JOB_SUBMIT } = require("../libs/kafkaTopics");

const submitFileJobRequest = async ({ fileId }) => {
  await kafkaProducer
    .send({
      topic: FILE_JOB_SUBMIT,
      messages: [{ key: fileId, value: `${fileId}` }]
    })
    .then(console.log("successful submitFileJobRequest Kafka"))
    .catch(e => console.error(`[producer/submitFileJobRequest] ${e.message}`, e));
};

const addToProcessTopic = async ({ fileId, fileSize }) => {
  await kafkaProducer
    .send({
      topic: FILE_TO_PROCESS,
      messages: [{ key: fileId, value: `${fileId}`, headers: { fileSize: fileSize.toString() } }]
    })
    .then(console.log("successful addToProcessTopic Kafka"))
    .catch(e => console.error(`[producer/addToProcessTopic] ${e.message}`, e));
};


module.exports = { addToProcessTopic, submitFileJobRequest };
