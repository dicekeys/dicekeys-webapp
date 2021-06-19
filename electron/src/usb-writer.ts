import * as net from "net"
import {Device} from "./trusted-main-electron-process/SeedableHardwareKeys/UsbDeviceMonitor";
import {monitorForFidoDevicesConnectedViaUsb} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedableHardwareKeys";
import {UsbSocketPath} from "./trusted-main-electron-process/SeedableHardwareKeys/IpcServer";
import {writeSeedToFIDOKey} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedHardwareKey";

let client = net.createConnection(UsbSocketPath, () => {

    const stopMonitoring = monitorForFidoDevicesConnectedViaUsb((devices: Device[]) => {
        client.write(JSON.stringify({devices: devices}))
    }, (error: any) => {
        client.write(JSON.stringify({error: error}))
    });

    client.on('data', (data => {
        let json = JSON.parse(data.toString())
        if(json.command == 'writeSeedToFIDOKey'){
            let data = json.data
            writeSeedToFIDOKey(data.deviceIdentifier, data.seedAs32BytesIn64CharHexFormat, data.extStateHexFormat)
        }

        if(data.toString() == 'destroy'){
            stopMonitoring()
            client.destroy()
        }
    }))

    client.on('close', function() {
        stopMonitoring()
        console.log('Connection closed');
    });
})







