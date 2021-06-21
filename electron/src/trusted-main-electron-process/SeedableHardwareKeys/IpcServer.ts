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
import {IpcResponsePacket, ipcSocketPath, isWin, WriteSeedToFIDOKeyRequestPacket, WriteSeedToFIDOKeyResponsePacket} from "../../usb";

function escapeParamCmd(value: any): string {
    // Make sure it's a string
    // Escape " -> \"
    // Surround with double quotes
    return `"${String(value).replace(/"/g, '\\"')}"`;
}
let ipcServer: Server | null
let clientSocket: Socket | null


// A queue of writeToFidoKey calls waiting for a response, in the order the call was issued
const writeToFidoKeyListenerQueue: ((packet: WriteSeedToFIDOKeyResponsePacket) => any)[] = [];


export function createIpcServer(deviceListUpdateCallback: DeviceListUpdateCallback, errorCallback?: ErrorCallback) : StopMonitoringFunction{
    ipcServer = net.createServer((socket: Socket) => {
        clientSocket = socket

        socket.on('data', (data => {
            let ipcPacket = JSON.parse(data.toString()) as IpcResponsePacket

            if(ipcPacket.command === "writeSeedToFIDOKey") {
                writeToFidoKeyListenerQueue.shift()?.(ipcPacket);
            }else if(ipcPacket.command == "listenForSeedableSecurityKeys"){
                if (ipcPacket.error != null){
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

export const ipcWriteSeedToFIDOKey = async (deviceIdentifier: DeviceUniqueIdentifier, seedAs32BytesIn64CharHexFormat: string, extStateHexFormat?: string): Promise<"success"> =>
    new Promise<"success">( (resolve, reject) => {
        const request: WriteSeedToFIDOKeyRequestPacket = {
            command: 'writeSeedToFIDOKey',
            data: {
                deviceIdentifier, seedAs32BytesIn64CharHexFormat, extStateHexFormat
            }
        };
        clientSocket?.write(JSON.stringify(request));
        writeToFidoKeyListenerQueue.push( (ipcPacket) => {
            if (ipcPacket.data != null && ipcPacket.error == null) {
                resolve("success");
            } else {
                reject(ipcPacket.error);
            }
        });
    });
