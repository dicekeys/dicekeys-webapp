import {Device} from "~trusted-main-electron-process/SeedableHardwareKeys/UsbDeviceMonitor";
import path from "path";

export const isWin = process.platform == "win32"
export const runUsbCommandsInSeparateProcess = false // a way to test is with macos / linux
export const isUsbWriterProcess = process.argv[1].indexOf('usb-writer') != -1
export const ipcSocketPath : string = process.platform == "win32" ? path.join('\\\\?\\pipe', process.cwd(), 'dicekeys') : 'usb.sock'

export interface DeviceUniqueIdentifier {
    vendorId: number;
    productId: number;
    serialNumber: string;
}

export interface WriteSeedToFIDOKeyPacket {
    deviceIdentifier: DeviceUniqueIdentifier,
    seedAs32BytesIn64CharHexFormat: string,
    extStateHexFormat?: string
}

export interface IpcPacket {
    command: 'listenForSeedableSecurityKeys' | 'writeSeedToFIDOKey' | 'destroy';
    data: WriteSeedToFIDOKeyPacket | Device[] | "success";
    error: string
}
