FROM debian:latest
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update \
    && apt-get -y install ghostscript perl-modules wget && apt-get clean

RUN mkdir /install-tl \
    && wget -qO- http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz \
    | tar -zxf - --strip-components=1 -C /install-tl

COPY texlive.profile /install-tl/

RUN /install-tl/install-tl -profile /install-tl/texlive.profile && rm -rf /install-tl

ENV PATH /usr/local/texlive/2014/bin/x86_64-linux:$PATH

RUN tlmgr install collection-fontsrecommended pgf pst-eps pst-node pst-tools pst-tree pstricks ucs varwidth xkeyval
