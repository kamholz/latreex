FROM stackbrew/ubuntu:13.10
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update
RUN apt-get -y install perl-modules wget ghostscript

ADD http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz /install-tl-unx.tar
RUN mkdir /install-tl
RUN tar -xf /install-tl-unx.tar --strip-components=1 -C /install-tl
ADD texlive.profile /install-tl/
RUN /install-tl/install-tl -profile /install-tl/texlive.profile

ENV PATH /usr/local/texlive/2013/bin/x86_64-linux:$PATH
RUN tlmgr install ucs xkeyval collection-fontsrecommended varwidth pgf pstricks pst-tree pst-node pst-eps pst-tools
