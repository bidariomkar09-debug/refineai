#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/Cellar/openjdk/21.0.2/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"

if [[ ! -d "$JAVA_HOME" ]]; then
  echo "Java 21 not found. Install: brew install openjdk"
  exit 1
fi

if [[ ! -d "$ANDROID_HOME" ]]; then
  echo "Android SDK not found. Install: brew install --cask android-commandlinetools"
  exit 1
fi

mkdir -p android
if [[ ! -f android/local.properties ]]; then
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

node scripts/generate-android-assets.mjs
npx capacitor-assets generate --android
npx cap sync android

cd android
./gradlew assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
cp "$APK" "$ROOT/RefineAI-v1.0.0-debug.apk"
echo ""
echo "APK ready: $ROOT/RefineAI-v1.0.0-debug.apk"
