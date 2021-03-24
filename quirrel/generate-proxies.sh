#!/bin/bash

function generate_proxy() {
  file=$1

  withoutExtension=$(echo $file | cut -f 1 -d '.')
  echo "module.exports = require('./dist/cjs/src/$withoutExtension');" > $withoutExtension.cjs
  echo "export * from './dist/esm/src/$withoutExtension'
export { default } from './dist/esm/src/$withoutExtension'" > $withoutExtension.d.ts
  echo "export * from './dist/esm/src/$withoutExtension'" > $withoutExtension.mjs
}

for file in $(ls -p src | grep -v /)
do
  if [ $file == 'index.ts' ]; then
		continue
	fi

  generate_proxy $file
done

generate_proxy "client.ts"