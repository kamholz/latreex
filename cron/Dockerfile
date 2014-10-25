FROM debian:wheezy
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update \
    && apt-get -y --no-install-recommends install \
        cron \
    && apt-get clean

COPY reaptrees.sh /src/
COPY crontab /etc/

CMD ["cron", "-f", "-L", "13"]
