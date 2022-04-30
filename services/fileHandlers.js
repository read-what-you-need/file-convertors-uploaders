const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");


const fileConvertor = require("ebook-convert");

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



module.exports = { getPage, getDownloadLinksFromPage, fileConvertorPromiseWrapper, downloadFile };
