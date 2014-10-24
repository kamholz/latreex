FROM debian:latest
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update && apt-get -y install apt-transport-https wget \
    && echo 'deb https://deb.nodesource.com/node wheezy main' > /etc/apt/sources.list.d/nodesource.list \
    && wget -qO- https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
    && apt-get update

RUN apt-get -y install cron ghostscript nodejs perl-modules supervisor \
    && apt-get clean \
    && npm update -g

RUN mkdir /install-tl \
    && wget -qO- http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz \
    | tar -zxf - --strip-components=1 -C /install-tl
COPY docker/texlive.profile /install-tl/
RUN /install-tl/install-tl -profile /install-tl/texlive.profile && rm -rf /install-tl
ENV PATH /usr/local/texlive/2014/bin/x86_64-linux:$PATH
RUN tlmgr install collection-fontsrecommended pgf pst-eps pst-node pst-tools pst-tree pstricks ucs varwidth xkeyval

RUN rm -rf /etc/supervisor
COPY docker/supervisord.conf /etc/

COPY . /src
RUN cd /src && npm install

EXPOSE 3001
ENV NODE_ENV production
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
