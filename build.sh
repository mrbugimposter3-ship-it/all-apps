#!/bin/bash
# Gradle-free Android build of the All Apps WebView wrapper: JDK 17 + Android SDK 34. Same debug key as Mevlanas.
set -e
cd "$(dirname "$0")"
JAVA_HOME=${JAVA_HOME:-$(ls -d /opt/jdk-17* | head -1)}; export PATH=$JAVA_HOME/bin:$PATH
SDK=${ANDROID_HOME:-/opt/android}; BT=$SDK/build-tools/34.0.0; AJ=$SDK/platforms/android-34/android.jar
KS=${KEYSTORE:-$HOME/.android/debug.keystore}
mkdir -p releases; cd android; rm -rf out && mkdir -p out/cls
$BT/aapt2 compile --dir res -o out/res.zip
$BT/aapt2 link -I $AJ --manifest AndroidManifest.xml -o out/base.apk out/res.zip
javac -nowarn -source 8 -target 8 -cp $AJ -d out/cls src/com/knowboran/allapps/*.java
$BT/d8 --lib $AJ --min-api 24 --output out $(find out/cls -name '*.class')
cp out/base.apk out/u.apk
python3 -c "import zipfile;zipfile.ZipFile('out/u.apk','a').write('out/classes.dex','classes.dex')"
$BT/zipalign -f 4 out/u.apk out/a.apk
$BT/apksigner sign --ks "$KS" --ks-pass pass:android --out ../releases/All-Apps.apk out/a.apk
rm -f ../releases/All-Apps.apk.idsig
$BT/apksigner verify --print-certs ../releases/All-Apps.apk | head -3 && echo "Built releases/All-Apps.apk"
