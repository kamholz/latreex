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
    && npm update -g \
    && npm cache clear

VOLUME /src

EXPOSE 3000

ENV NODE_ENV production

CMD ["node", "/src/app.js"]
