FROM ubuntu:14.04.1
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update && apt-get -y install perl-modules wget ghostscript && apt-get clean

ADD http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz /install-tl-unx.tar.gz
RUN mkdir /install-tl && tar -xzf /install-tl-unx.tar.gz --strip-components=1 -C /install-tl
ADD texlive.profile /install-tl/
RUN /install-tl/install-tl -profile /install-tl/texlive.profile && rm -rf /install-tl

ENV PATH /usr/local/texlive/2014/bin/x86_64-linux:$PATH
RUN tlmgr install ucs xkeyval collection-fontsrecommended varwidth pgf pstricks pst-tree pst-node pst-eps pst-tools
