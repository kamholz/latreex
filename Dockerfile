FROM davekam/latreex_texlive
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update \
    && apt-get -y install --no-install-recommends \
        apt-transport-https \
        ca-certificates \
    && echo 'deb https://deb.nodesource.com/node wheezy main' > /etc/apt/sources.list.d/nodesource.list \
    && wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
    && apt-get update \
    && apt-get -y install nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest \
    && npm cache clear

EXPOSE 3000

ENV NODE_ENV production

ADD . /src

RUN cd /src \
    && chown -R www-data public \
    && npm install \
    && npm cache clear

CMD ["node", "/src/app.js"]
