FROM davekam/texlive
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN echo deb http://ppa.launchpad.net/chris-lea/node.js/ubuntu saucy main > /etc/apt/sources.list.d/nodejs.list
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C7917B12
RUN apt-get update
RUN apt-get -y install nodejs cron
RUN npm update -g
RUN npm install -g forever

RUN echo */1 * * * * root /src/script/reaptrees.sh /src > /etc/crontab

ADD . /src
RUN cd /src; rm -rf node_modules; npm install

EXPOSE 3001
CMD ["node", "/src/app.js"]
