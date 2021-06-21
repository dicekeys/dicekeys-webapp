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

export interface WriteSeedToFIDOKeyData {
    deviceIdentifier: DeviceUniqueIdentifier;
    seedAs32BytesIn64CharHexFormat: string;
    extStateHexFormat?: string;
}

interface BaseIpcRequestPacket<COMMAND extends string> {
    command: COMMAND;
}

export interface WriteSeedToFIDOKeyRequestPacket extends BaseIpcRequestPacket<"writeSeedToFIDOKey"> {
    data: WriteSeedToFIDOKeyData;
}
// This command would exist, but listening is automatically inferred on connection
// export type ListenForSeedableSecurityKeysRequestPacket = BaseIpcRequestPacket<"listenForSeedableSecurityKeys">;
export type DestroyIpcChannelRequestPacket = BaseIpcRequestPacket<"destroy">;

export type IpcRequestPacket =
    WriteSeedToFIDOKeyRequestPacket |
//    ListenForSeedableSecurityKeysRequestPacket |
    DestroyIpcChannelRequestPacket;


type BaseIpcResponsePacket<COMMAND extends string, DATA> = {
    command: COMMAND;
    data?: DATA;
    error?: string;
}

export type WriteSeedToFIDOKeyResponsePacket = BaseIpcResponsePacket<"writeSeedToFIDOKey", "success">;
export type ListenForSeedableSecurityKeysResponsePacket = BaseIpcResponsePacket<"listenForSeedableSecurityKeys", Device[]>;
export type DestroyIpcChannelResponsePacket = BaseIpcResponsePacket<"destroy", "success">;

export type IpcResponsePacket =
    WriteSeedToFIDOKeyResponsePacket |
    ListenForSeedableSecurityKeysResponsePacket |
    DestroyIpcChannelResponsePacket;
