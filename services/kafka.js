const { kafkaProducer } = require("../libs/kafkaConnector");
const { FILE_CONVERTED } = require("../libs/kafkaTopics");

const fileConvertedStatusUpdated = async ({ fileId, fileName, fileSize }) => {
  await kafkaProducer
    .send({
      topic: FILE_CONVERTED,
      messages: [{ key: fileId, value: `${fileName}`, headers: { fileSize: fileSize.toString() } }]

    })
    .catch(e => {
      throw new Error(`[producer/fileConvertedStatusUpdated] ${e.message}: ${e.stack}`);
    });

};

module.exports = { fileConvertedStatusUpdated };
