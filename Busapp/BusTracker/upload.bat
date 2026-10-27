@echo off
setlocal
set CLI=C:\Users\wesly\AppData\Local\Programs\arduino-cli\arduino-cli.exe
echo ====================================================
echo STM32F103C6 (32K Flash) Firmware Upload Helper
echo ====================================================
echo.
echo Select your upload method:
echo   1. ST-Link V2 [SWD - Recommended]
echo   2. Serial / USB-to-TTL Adapter [BOOT0 set to 1]
echo.

set METHOD=1
if not "%~1"=="" (
    set METHOD=%~1
) else (
    set /p METHOD="Choose method (1 or 2, default 1): "
)

if "%METHOD%"=="2" goto do_serial
goto do_stlink

:do_stlink
echo.
echo Compiling firmware...
"%CLI%" compile --fqbn STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C6,opt=oslto --output-dir "%~dp0build" "%~dp0BusTracker.ino"
if %ERRORLEVEL% NEQ 0 goto finish

echo.
echo Uploading via ST-Link (pyOCD)...
python -m pyocd flash -t stm32f103rc -e chip "%~dp0build\BusTracker.ino.hex"
if %ERRORLEVEL% EQU 0 (
    python -m pyocd reset -t stm32f103rc
)
goto finish

:do_serial
echo.
echo Available COM Ports:
"%CLI%" board list
echo.
set /p COMPORT="Enter COM port (e.g. COM3): "
if "%COMPORT%"=="" (
    echo [ERROR] No COM port specified.
    goto finish
)
echo Uploading via Serial on %COMPORT%...
"%CLI%" upload -p %COMPORT% --fqbn STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C6,opt=oslto,upload_method=serialMethod "%~dp0BusTracker.ino"
goto finish

:finish
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Flash completed successfully!
) else (
    echo.
    echo [ERROR] Flash failed. Please ensure the programmer and board are connected.
)
pause
