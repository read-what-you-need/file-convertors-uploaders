FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y python3-pip python3-dev \
  && cd /usr/local/bin \
  && ln -s /usr/bin/python3 python \
  && pip3 install --upgrade pip

RUN apt-get install -y wget \
&& wget -nv -O- https://download.calibre-ebook.com/linux-installer.sh | sh /dev/stdin

RUN apt install -y libnss3-dev libgdk-pixbuf2.0-dev libgtk-3-dev libxss-dev curl

RUN apt-get update && \
 apt-get install -y npm 

RUN curl -sL https://deb.nodesource.com/setup_16.x  |  bash -

RUN apt-get -y install nodejs

WORKDIR "/usr/app"

COPY package.json .
RUN npm install
RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache
COPY . .

CMD ["node", "index.js"]
