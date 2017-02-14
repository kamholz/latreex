FROM debian:wheezy
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
        ghostscript \
        netpbm \
        perl-modules \
        poppler-utils \
        wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /install-tl \
    && wget -qO- http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz \
    | tar -zxf - --strip-components=1 -C /install-tl

COPY texlive.profile /install-tl/

RUN /install-tl/install-tl -profile /install-tl/texlive.profile && rm -rf /install-tl

ENV PATH /usr/local/texlive/2016/bin/x86_64-linux:$PATH

RUN tlmgr install bidi cm-unicode collection-fontsrecommended fontspec pgf preview pst-node pst-tools pst-tree pstricks ucs varwidth xcolor xetex xetex-pstricks xkeyval

# apt-get install ttf-mscorefonts-installer
