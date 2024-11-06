import serial
import time

def read_uart_data(port, baud_rate=9600, timeout=1):
    # Open the serial port
    with serial.Serial(port, baud_rate, timeout=timeout) as ser:
        print(f"Connected to {port} at {baud_rate} baud.")
        
        while True:
            if ser.in_waiting > 0:  # Check if there's data in the buffer
                data = ser.readline().decode('utf-8').strip()  # Read a line of data
                print(f"Received data: {data}")
            time.sleep(0.1)  # Add a slight delay for readability

import serial
import serial.tools.list_ports
import time

def find_uart_device(vendor_id, baud_rate=9600, timeout=1):
    # List all connected serial devices
    ports = serial.tools.list_ports.comports()
    
    # Search for a device with the specified Vendor ID
    for port in ports:
        if port.vid == vendor_id:
            print(f"Device found: {port.device} with Vendor ID: {hex(vendor_id)}")
            try:
                # Open the serial port
                with serial.Serial(port.device, baud_rate, timeout=timeout) as ser:
                    print(f"Connected to {port.device} at {baud_rate} baud.")
                    
                    # Continuously read data
                    while True:
                        if ser.in_waiting > 0:  # Check if there's data in the buffer
                            data = ser.read(ser.in_waiting)  # Read the available data as bytes
                            hex_data = data.hex()  # Convert bytes to hex string
                            print(f"Received data: {hex_data}")
                        time.sleep(0.1)  # Add a slight delay for readability
            except serial.SerialException as e:
                print(f"Could not open serial port: {e}")
            return
    print(f"No device found with Vendor ID: {hex(vendor_id)}")

# Vendor ID for the device (e.g., 0x10C4)
find_uart_device(0x10C4)
