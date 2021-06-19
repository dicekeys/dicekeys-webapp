import {Server, Socket} from "net";
import * as net from "net"
import * as path from "path"
import * as sudo from "sudo-prompt"
import * as child_process from 'child_process'
import fs from "fs";
import {
    DeviceListUpdateCallback, ErrorCallback,
    StopMonitoringFunction
} from "./UsbDeviceMonitor";
import {ExecException} from "child_process";
import {DeviceUniqueIdentifier} from "../../../../common/IElectronBridge";
import {isWin} from "../../usb";

export var UsbSocketPath : string

if(process.platform == "win32"){
    UsbSocketPath = path.join('\\\\?\\pipe', process.cwd(), 'dicekeys')
} else {
    UsbSocketPath = 'usb.sock'
}

function escapeParamCmd(value: any): string {
    // Make sure it's a string
    // Escape " -> \"
    // Surround with double quotes
    return `"${String(value).replace(/"/g, '\\"')}"`;
}
let ipcServer: Server | null
let clientSocket: Socket | null
export function createIpcServer(deviceListUpdateCallback: DeviceListUpdateCallback, errorCallback?: ErrorCallback) : StopMonitoringFunction{
    ipcServer = net.createServer((socket: Socket) => {
        clientSocket = socket

        socket.on('data', (data => {
            let json = JSON.parse(data.toString())

            if (json.error) {
                errorCallback?.(json.error)
            } else if (json.devices) {
                deviceListUpdateCallback(json.devices)
            }
        }))
    });

    if(!isWin){
        // clear socket file
        if(fs.existsSync(UsbSocketPath))  fs.unlinkSync(UsbSocketPath)
    }

    console.log("Starting IPC Server", UsbSocketPath)

    ipcServer.listen(UsbSocketPath, () => {
        let cmd = escapeParamCmd(process.argv[0]) + ' ' + path.join('dist', 'src', 'usb-writer.js')

        const callback = (error?: Error | ExecException | null, stdout?: string | Buffer, stderr?: string | Buffer) => {
            console.log('usb-writer terminated')
            console.log(error)
            console.log(stdout)
            console.log(stderr)
        }

        const env = {
            ELECTRON_RUN_AS_NODE: '1',
        }

        // Elevate
        if(isWin){
            console.log("Elavate", cmd)
            sudo.exec(cmd, {
                name: 'DiceKeys',
                env,
            }, callback)
        }else{
            // on macos / linux run it a a regular exec
            console.log("Spawn", cmd)
            child_process.exec(cmd,{
                env,
            }, callback)
        }
    });

    // stopMonitoring callback
    return () => {
        console.log("Closing IPC server")
        ipcServer?.close()
        ipcServer = null
    }
}

export const ipcWriteSeedToFIDOKey = async (deviceIdentifier: DeviceUniqueIdentifier, seedAs32BytesIn64CharHexFormat: string, extStateHexFormat?: string) => {
    clientSocket?.write(JSON.stringify({
        command: 'writeSeedToFIDOKey',
        data: {
            deviceIdentifier, seedAs32BytesIn64CharHexFormat, extStateHexFormat
        }
    }))
    // TODO fix this to handle the response
    return "success" as const;
}
