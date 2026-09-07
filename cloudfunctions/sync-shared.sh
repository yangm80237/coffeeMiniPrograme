#!/bin/bash
# 把 _shared 工具同步进每个云函数目录的 utils/（云函数独立部署，不能外部 require）
# 部署前执行一次：bash cloudfunctions/sync-shared.sh
set -e
cd "$(dirname "$0")"
FUNCS="user bean brand flavor stats admin init"
for f in $FUNCS; do
  mkdir -p "$f/utils"
  cp _shared/status.js _shared/format.js _shared/flags.js "$f/utils/"
done
echo "synced utils -> $FUNCS"
