const { kafkaConsumer } = require("../libs/kafkaConnector");

const { FILE_JOB_SUBMIT } = require("../libs/kafkaTopics");

const kakfkaConsumer = async () => {
  let fileSubmittedConsumer = kafkaConsumer({ groupId: "node-server-kafka-file-submitted-consumers" });

  await fileSubmittedConsumer.connect();
  await fileSubmittedConsumer.subscribe({ topic: FILE_JOB_SUBMIT, fromBeginning: false });
  
  await fileSubmittedConsumer
    .run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received message in topic: ${topic}:${partition}:${message.offset}:${message.timestamp} ${message.key}#${message.value}`);
        const fileId = message.value.toString("utf-8");
      }
    })
    .then(console.log("fileSubmittedConsumer running .."))
    .catch(e => console.error(`[producer/fileSubmittedConsumer] ${e.message}`, e));
};

module.exports = kakfkaConsumer;
