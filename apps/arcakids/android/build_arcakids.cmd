@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\Usuario\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\Usuario\Android\Sdk"
set "PATH=C:\Users\Usuario\.local\nodejs\node-v24.20.0-win-x64;%PATH%"
cd /d "%~dp0"
call gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a" --console=plain
exit /b %errorlevel%