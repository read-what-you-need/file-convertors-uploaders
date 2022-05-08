FROM nikolaik/python-nodejs

RUN apt-get install -y wget \
&& wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin

RUN apt install -y libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev curl

WORKDIR "/usr/app"

COPY package.json .
RUN npm install
RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache
COPY . .

CMD ["node", "index.js"]
