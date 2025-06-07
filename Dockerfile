FROM ruby:3.3.0

RUN apt-get update -qq && \
    apt-get install -y build-essential libssl-dev default-mysql-client nodejs npm netcat-openbsd && \
    npm install -g yarn && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile ./
# Remove Gemfile.lock if it exists and run bundle install
RUN bundle config set force_ruby_platform true && \
    bundle install

COPY . /app

COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

COPY wait-for-it.sh /usr/bin/
RUN chmod +x /usr/bin/wait-for-it.sh

# Create tmp directories for Puma
RUN mkdir -p /app/tmp/pids

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
