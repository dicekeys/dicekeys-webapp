import * as net from "net"
import {Device} from "./trusted-main-electron-process/SeedableHardwareKeys/UsbDeviceMonitor";
import {monitorForFidoDevicesConnectedViaUsb} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedableHardwareKeys";
import {writeSeedToFIDOKey} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedHardwareKey";
import {IpcRequestPacket, ipcSocketPath, ListenForSeedableSecurityKeysResponsePacket, WriteSeedToFIDOKeyResponsePacket} from "./usb";

let client = net.createConnection(ipcSocketPath, () => {
    // Will report list of keys connected to USB
    // Automatically starts monitoring for keys inserted/removed into USB
    // Can receive commands to write to USB devices
    // Must be told to stop monitoring via a connection close or destroy packet lest the process will never terminate.

    // Immediately start monitoring for USB insertions/removals
    const stopMonitoring = monitorForFidoDevicesConnectedViaUsb((devices: Device[]) => {
        client.write(JSON.stringify({
            command: 'listenForSeedableSecurityKeys',
            data: devices
        } as ListenForSeedableSecurityKeysResponsePacket))
    }, (error: any) => {
        client.write(JSON.stringify({
            command: 'listenForSeedableSecurityKeys',
            error: error
        } as ListenForSeedableSecurityKeysResponsePacket))
    });

    // Handle further requests after process start
    client.on('data', (data => {
        const requestPacket = JSON.parse(data.toString()) as IpcRequestPacket

        // The request is to write to a FIDO key
        if (requestPacket.command == 'writeSeedToFIDOKey') {
            const {data} = requestPacket;

            writeSeedToFIDOKey(data.deviceIdentifier, data.seedAs32BytesIn64CharHexFormat, data.extStateHexFormat).then(result => {
                const response: WriteSeedToFIDOKeyResponsePacket = {
                    command : 'writeSeedToFIDOKey',
                    data: result
                }
                client.write(JSON.stringify(response))
            }).catch( exception => {
                const response: WriteSeedToFIDOKeyResponsePacket = {
                    command : 'writeSeedToFIDOKey',
                    error: exception
                }
                client.write(JSON.stringify(response))
            })
        } else if (requestPacket.command == 'destroy') {
            // The request is to close the channel
            stopMonitoring()
            client.destroy()
        }
    }))

    client.on('close', function () {
        stopMonitoring()
        console.log('Connection closed');
    });
})







