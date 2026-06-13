@echo off
chcp 65001 >nul
cd /d "%~dp0"
python serve.py
echo.
echo サーバーが終了しました。何かキーを押すと閉じます。
pause >nul
