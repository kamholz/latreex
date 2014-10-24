FROM debian:latest
MAINTAINER David Kamholz <lautgesetz@gmail.com>

RUN apt-get update && apt-get -y install cron

COPY reaptrees.sh /src/
COPY crontab /etc/

CMD ["cron", "-f", "-L", "13"]
