FROM davekam/texlive
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN echo deb http://ppa.launchpad.net/chris-lea/node.js/ubuntu saucy main > /etc/apt/sources.list.d/nodejs.list
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys C7917B12
RUN apt-get update
RUN apt-get -y install nodejs cron supervisor
RUN apt-get clean
RUN npm update -g

ADD etc/crontab /etc/crontab
RUN chown root:root /etc/crontab

RUN rm -rf /etc/supervisor
ADD etc/supervisord.conf /etc/supervisord.conf

ADD . /src
RUN cd /src; rm -rf node_modules; npm install
RUN chown -R nobody /src

EXPOSE 3001
ENV NODE_ENV production
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
