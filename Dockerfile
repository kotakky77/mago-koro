FROM ruby:3.2.2

RUN apt-get update -qq && \
    apt-get install -y build-essential libssl-dev default-mysql-client nodejs npm netcat-openbsd && \
    npm install -g yarn && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . /app

COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

COPY wait-for-it.sh /usr/bin/
RUN chmod +x /usr/bin/wait-for-it.sh

# Create tmp directories for Puma
RUN mkdir -p /app/tmp/pids

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
