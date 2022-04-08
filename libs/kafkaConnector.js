const { Kafka, logLevel } = require("kafkajs");

const host = process.env.KAFKA_BROKER_HOST;
const kafka = new Kafka({
  brokers: [`${host}`],
  clientId: "node-js-app-download-convertor-uploader-service"
});

const kafkaProducer = kafka.producer({ allowAutoTopicCreation: false, transactionTimeout: 30000 });

const kafkaConsumer = ({ groupId }) => kafka.consumer({ groupId });

module.exports = {
  kafka,
  kafkaProducer,
  kafkaConsumer
};
