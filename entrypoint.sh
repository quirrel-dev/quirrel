#!/usr/bin/env sh

# In development, Quirrel needs to call
# endpoints á la "localhost:3000".
# to make that work easily,
# we need to adapt /etc/hosts.
# 
# Source of the ~/hosts.new trick:
# http://blog.jonathanargentiero.com/docker-sed-cannot-rename-etcsedl8ysxl-device-or-resource-busy/

DOCKER_HOST_IP=`getent hosts host.docker.internal | grep -o '^\S*'`
cp /etc/hosts ~/hosts.new
sed -i "s/127.0.0.1/$DOCKER_HOST_IP/g" ~/hosts.new
cp ~/hosts.new /etc/hosts 

# Run CMD
exec "$@"
