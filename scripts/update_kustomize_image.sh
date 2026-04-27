#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "usage: $0 <manifest-file> <service-name> <new-name> <new-tag>" >&2
  exit 1
fi

manifest_file="$1"
service_name="$2"
new_name="$3"
new_tag="$4"

target_name="<aws_account_id>.dkr.ecr.ap-northeast-2.amazonaws.com/shop-msa/${service_name}"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

awk -v target_name="$target_name" -v new_name="$new_name" -v new_tag="$new_tag" '
  $1 == "-" && $2 == "name:" && $3 == target_name {
    print
    getline
    print "    newName: " new_name
    getline
    print "    newTag: " new_tag
    next
  }
  { print }
' "$manifest_file" > "$tmp_file"

mv "$tmp_file" "$manifest_file"
