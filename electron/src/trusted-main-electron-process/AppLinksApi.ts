import * as IpcApiFactory from "./IpcApiFactory";
import {app, BrowserWindow, ipcRenderer} from "electron";
import {RemoveListener} from "../../../common/IElectronBridge";

let appLinkUrl: string[]

export function registerAppLinkProtocol(){
    app.setAsDefaultProtocolClient('dicekeys')

    // Protocol handler for win32
    if (process.platform == 'win32') {
        // Keep only command line / deep linked arguments
        appLinkUrl = process.argv.slice(1)
    }
}

export function sendAppLink(appLink: string[], window: BrowserWindow){
    appLinkUrl = appLink
    if (window && window.webContents) {
        window.webContents.send('applink', appLinkUrl)
    }
}

IpcApiFactory.implementSyncApi( "getAppLink", () => {
    return appLinkUrl
});
IpcApiFactory.implementListenerApi("listenForAppLinks", (callback : (applink: string[]) => any, _ ?: (error: any) => any) : RemoveListener => {
    const listener = (_: any, args: string[]) => callback(args)
    ipcRenderer.on('applink', listener);
    return () => {
        ipcRenderer.removeListener('applink', listener)
    };
});
