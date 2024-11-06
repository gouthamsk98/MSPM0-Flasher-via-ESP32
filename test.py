MAX_BUFF_LEN = 64
SETUP 		 = False
port 		 = None
BSL          = False
CRC32_POLY = 0xEDB88320

#FUNCTIONS
START      = 0x01
ERASE      = 0x02
PAGE_ERASE = 0x03
WRITE      = 0x04
READ       = 0x05
VERIFY     = 0x06
START_APP  = 0x07
EXIT       = 0x08
ACK        = 9         #hexa to decimal value of 0x09       
DATA       = 16        #hexa to decimal value of 0x10

FOR_WRITE  = 0x11
FOR_READ   = 0x22

OK = b'\x01'
FAIL = b'\x00'

"""
calculates and returns the checksum 

parameters : 
    transmit frame 
    length of tx_frame
"""
def checkSum(buf, length):
    temp = 0
    for i in range(2 , length - 1):
        temp += buf[i]
       
    temp = temp & 0xFF
    temp = ~temp & 0xFF
    
    return temp 

def frame_to_serial(cmd , fun , data , length):

    size = length + 9                #total frame size
    frameLength = length + 2         #size of data + cmd + function
    tx_frame = [0]*size              

    "SEND FRAME : [0xF9 ,0xFF, L1,L2,L3,L4 ,cmd, function, parameter seq... , CKSM]"
    tx_frame[0] = 0xF9
    tx_frame[1] = 0xFF
    tx_frame[2] = (frameLength >> 24) & 0xFF
    tx_frame[3] = (frameLength >> 16) & 0xFF
    tx_frame[4] = (frameLength >> 8)  & 0xFF
    tx_frame[5] = (frameLength) & 0xFF 
    tx_frame[6] = cmd
    tx_frame[7] = fun
    tx_frame[8:] = data
    tx_frame.append(checkSum(tx_frame , len(tx_frame)))

    return tx_frame
CRC32_POLY = 0xEDB88320
def lsb(x):
    return x & 0x00FF
def software_crc(data: bytes, length: int) -> bytes:
    crc = 0xFFFFFFFF
    CRC32_POLY = 0xEDB88320  # Make sure CRC32_POLY is defined

    for byte in data[:length]:
        crc ^= byte

        for _ in range(8):
            mask = -(crc & 1)
            crc = (crc >> 1) ^ (CRC32_POLY & mask)

    # Convert crc to bytes and ensure it is of length 4 (32 bits)
    return crc.to_bytes(4)
# print(lsb(0x01))
data=[0x80, 0x01, 0x00, 0x12]

byte_string=software_crc(data, 4)
print(byte_string)
# print(byte_string)
# decimal_array = list(byte_string)
# print(decimal_array)