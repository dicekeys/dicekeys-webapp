FROM ubuntu:20.04

# Create dicekeys directory
WORKDIR /dicekeys

VOLUME /dicekeys

RUN dpkg --add-architecture i386 \
    && apt-get update \
    && DEBIAN_FRONTEND="noninteractive" apt-get install -y curl rpm zip build-essential git software-properties-common wget mono-complete  \
    && curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs wine32 wine64

CMD npm install && npm run dist && npm run dist --win --x64
