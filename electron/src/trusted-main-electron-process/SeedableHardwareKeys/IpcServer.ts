import {Server, Socket} from "net";
import * as net from "net"
import * as path from "path"
import * as sudo from "sudo-prompt"
import * as child_process from 'child_process'
import fs from "fs";
import {
    Device,
    DeviceListUpdateCallback, ErrorCallback,
    StopMonitoringFunction
} from "./UsbDeviceMonitor";
import {ExecException} from "child_process";
import {DeviceUniqueIdentifier} from "../../../../common/IElectronBridge";
import {IpcPacket, ipcSocketPath, isWin} from "../../usb";

function escapeParamCmd(value: any): string {
    // Make sure it's a string
    // Escape " -> \"
    // Surround with double quotes
    return `"${String(value).replace(/"/g, '\\"')}"`;
}
let ipcServer: Server | null
let clientSocket: Socket | null

let writeSeedToFIDOKeyPromiseResolve: (value: 'success') => void;
let writeSeedToFIDOKeyPromiseReject: (reason?: any) => void;
const writeSeedToFIDOKeyPromise : (resolve: (value: 'success') => void, reject: (reason?: any) => void) => void = (resolve, reject) => {
    writeSeedToFIDOKeyPromiseResolve = resolve
    writeSeedToFIDOKeyPromiseReject = reject
}

export function createIpcServer(deviceListUpdateCallback: DeviceListUpdateCallback, errorCallback?: ErrorCallback) : StopMonitoringFunction{
    ipcServer = net.createServer((socket: Socket) => {
        clientSocket = socket

        socket.on('data', (data => {
            let ipcPacket = JSON.parse(data.toString()) as IpcPacket

            if(ipcPacket.command == 'writeSeedToFIDOKey'){

                if (ipcPacket.error) {
                    writeSeedToFIDOKeyPromiseReject(ipcPacket.error)
                } else if (ipcPacket.data) {
                    writeSeedToFIDOKeyPromiseResolve('success')
                }

            }else if(ipcPacket.command == 'listenForSeedableSecurityKeys'){
                if(ipcPacket.error){
                    errorCallback?.(ipcPacket.error)
                }else{
                    deviceListUpdateCallback(ipcPacket.data as Device[])
                }
            }
        }))
    });

    if(!isWin){
        // clear socket file
        if(fs.existsSync(ipcSocketPath))  fs.unlinkSync(ipcSocketPath)
    }

    console.log("Starting IPC Server", ipcSocketPath)
    console.log("Listening or writing to USB devices requires the app to run with elevated privileges. \n" +
        "A UAC dialog will be displayed to requesting admin rights for that purpose.")

    ipcServer.listen(ipcSocketPath, () => {
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
            console.log("Elevate", cmd)
            sudo.exec(cmd, {
                name: 'DiceKeys',
                env,
            }, callback)
        }else{
            // on macos / linux run it with regular exec
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
    } as IpcPacket))

    return new Promise(writeSeedToFIDOKeyPromise)
}
