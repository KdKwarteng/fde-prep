#!/usr/bin/env bash
# Rebuilds public/java/harness.jar from java/src. Needs JDK 17 or newer.
# The jar is committed because Vercel's build image has no JDK.
set -euo pipefail
cd "$(dirname "$0")/.."
out=$(mktemp -d)
javac --release 17 -d "$out" $(find java/src -name '*.java')
jar --create --file public/java/harness.jar -C "$out" .
rm -rf "$out"
echo "Built public/java/harness.jar"
