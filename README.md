# Port11 - MSPM0 Flasher Tool via UART

This tool can be used to FLASH, ERASE, GET_INFO, and VERIFY your MSPM0 via the UART PIN of the MSPM0. Make sure to put the MSPM0 in BSL mode manually before using this tool. Alternatively, you can use another microcontroller to toggle the GPIO of the MSPM0 to put it in BSL mode. This implementation uses an ESP32-S3 as a debugger to pass messages between the MSPM0 and the web client serial. You can find the firmware file in the firmware folder. Use the [ESP32 online Flasher](https://espressif.github.io/esptool-js/) to flash the firmware at address 0x0.

## Support Series

- [x] MSPM0

## Tested Chips

- [x] MSPM0G3507

## Author

[Goutham S Krishna](https://www.linkedin.com/in/goutham-s-krishna-21ab151a0/)
