@echo off
setlocal
set CLI=C:\Users\wesly\AppData\Local\Programs\arduino-cli\arduino-cli.exe
echo ====================================================
echo Compiling BusTracker for STM32F103C6 Blue Pill (32K)...
echo ====================================================

"%CLI%" compile --fqbn STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C6,opt=oslto "%~dp0BusTracker.ino"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Compilation Succeeded! Flash and RAM verified for 32KB C6.
) else (
    echo.
    echo [ERROR] Compilation Failed!
)
