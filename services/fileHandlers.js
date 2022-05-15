const path = require("path");
const cheerio = require("cheerio");
const fs = require("fs");
const axios = require("axios");
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

async function downloadFile({ link, fileId }) {
  let outputPath = `./files/${fileId}/`;
  let fileUrl = link;
  fileExtension = path.extname(fileUrl);
  let downloadFilePath = outputPath + "file" + fileExtension;
  const file = fs.createWriteStream(downloadFilePath);
  console.log(`file download started`);

  return axios({
    method: "get",
    url: fileUrl,
    timeout: 1000 * 15,
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

async function resilientDownloader({ links, fileId }) {
  let linkPreference = [1, 0, 2, 4];
  return new Promise(async (resolve, reject) => {
    for (let index = 0; index < linkPreference.length; index++) {
      console.log(index > 1 ? "resilient download active" : "");
      const link = links[index];
      try {
        await downloadFile({ link, fileId })
          .then(response => {
            resolve(response);
          })
          .catch(err => {
            throw new Error(err.message);
          });
        break;
      } catch (err) {
        console.log("error resilientDownload: " + err.message);
      }
    }
    const error = new Error(`File ${fileId} could not be downloaded`);
    reject(error);
  });
}

module.exports = { getPage, getDownloadLinksFromPage, resilientDownloader, fileConvertorPromiseWrapper };
