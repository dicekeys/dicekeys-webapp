import * as net from "net"
import {Device} from "./trusted-main-electron-process/SeedableHardwareKeys/UsbDeviceMonitor";
import {monitorForFidoDevicesConnectedViaUsb} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedableHardwareKeys";
import {writeSeedToFIDOKey} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedHardwareKey";
import {IpcPacket, ipcSocketPath, WriteSeedToFIDOKeyPacket} from "./usb";

let client = net.createConnection(ipcSocketPath, () => {

    const stopMonitoring = monitorForFidoDevicesConnectedViaUsb((devices: Device[]) => {
        client.write(JSON.stringify({
            command: 'listenForSeedableSecurityKeys',
            data: devices
        } as IpcPacket))
    }, (error: any) => {
        client.write(JSON.stringify({
            command: 'listenForSeedableSecurityKeys',
            error: error
        } as IpcPacket))
    });

    client.on('data', (data => {
        let json = JSON.parse(data.toString()) as IpcPacket

        if (json.command == 'writeSeedToFIDOKey') {
            let data = json.data as WriteSeedToFIDOKeyPacket

            writeSeedToFIDOKey(data.deviceIdentifier, data.seedAs32BytesIn64CharHexFormat, data.extStateHexFormat).then(result => {
                client.write(JSON.stringify({
                    command : 'writeSeedToFIDOKey',
                    data: result
                } as IpcPacket))
            }).catch( exception =>
                client.write(JSON.stringify({
                    command : 'writeSeedToFIDOKey',
                    error: exception
                } as IpcPacket))
            )
        } else if (json.command == 'destroy') {
            stopMonitoring()
            client.destroy()
        }
    }))

    client.on('close', function () {
        stopMonitoring()
        console.log('Connection closed');
    });
})







