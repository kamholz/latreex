FROM davekam/texlive
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update && apt-get -y install apt-transport-https \
    && echo 'deb https://deb.nodesource.com/node wheezy main' > /etc/apt/sources.list.d/nodesource.list \
    && wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
    && apt-get update

RUN apt-get -y install nodejs && apt-get clean && npm update -g

COPY . /src
RUN cd /src && npm install

EXPOSE 3001
ENV NODE_ENV production
CMD ["node", "/src/app.js"]
