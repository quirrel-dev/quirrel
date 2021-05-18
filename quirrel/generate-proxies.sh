#!/bin/bash

function generate_proxy() {
  file=$1

  withoutExtension=$(echo $file | cut -f 1 -d '.')
  echo "module.exports = require('./dist/cjs/src/$withoutExtension');" > $withoutExtension.cjs
  cp $withoutExtension.cjs $withoutExtension.js

  withExtension="$withoutExtension.js"
  if [ $withoutExtension == 'client' ]; then
		withExtension="client/index.js"
	fi
  echo "export * from './dist/esm/src/$withExtension'
export { default } from './dist/esm/src/$withExtension'" > "$withoutExtension.d.ts"
  echo "export * from './dist/esm/src/$withExtension'" > "$withoutExtension.mjs"
}

for file in $(ls -p src | grep -v /)
do
  if [ $file == 'index.ts' ]; then
		continue
	fi

  generate_proxy $file
done

generate_proxy "client.ts"
