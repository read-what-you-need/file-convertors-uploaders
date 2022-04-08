require("dotenv").config({ path: ".env" });
const axios = require("axios");
const cheerio = require("cheerio");

const kafkaConsumers = require("./services/kafkaConsumer");

// connect consumer

kafkaConsumers();

// download topic

// async function getPage(md5) {
//   let url = process.env.DOWNLOAD_STORE + md5;
//   return axios.get(url).then(function (response) {
//     return response.data;
//   });
// }

// function getDownloadLinksFromPage(html) {
//   let links = [];
//   const $ = cheerio.load(html);
//   $("#download a[href]").each((_index, elem) => {
//     let link = $(elem).attr("href");
//     links.push(link);
//   });
//   return links;
// }


async function main() {
//   let pageHtml = await getPage("d943f697e1757ef0c461a932cdcc9cb5");
//   let links = getDownloadLinksFromPage(pageHtml);
  console.log(links);
}
main();

// convert book

// upload book

// produce : completed

// produce : status update
