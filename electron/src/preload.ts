// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import {contextBridge, ipcRenderer} from "electron";
import type {
  IElectronBridge,
  RemoveListener
} from "../../common/IElectronBridge"
import {
  ElectronBridgeListenerApiCallback,
  ElectronIpcListenerRequestChannelName,
  ElectronIpcAsyncRequestChannelName,
  ElectronIpcSyncRequestChannelName,
  ElectronBridgeAsyncApiRequest,
  ElectronBridgeSyncApiRequest,
  ElectronBridgeAsyncApiResponse,
  ElectronBridgeSyncApiResponse,
  ElectronBridgeListenerApiSetupArgs,
  exceptionCodeFor,
  responseChannelNameFor,
  terminateChannelNameFor,
  ElectronBridgeListenerApiErrorCallback,
  ElectronBridgeListenerApiCallbackParameters,
  ElectronBridgeListenerApiErrorCallbackParameters
} from "./trusted-main-electron-process/ElectronBridge";

const createIpcSyncRequestClientFunction = <CHANNEL extends ElectronIpcSyncRequestChannelName>(channel: CHANNEL) =>
  (...args: ElectronBridgeSyncApiRequest<CHANNEL>) => ipcRenderer.sendSync(channel, ...args) as ElectronBridgeSyncApiResponse<CHANNEL>

type Awaited<T> = Promise<T> extends Promise<infer U> ? U : never;
const createIpcAsyncRequestClientFunction = <CHANNEL extends ElectronIpcAsyncRequestChannelName>(channel: CHANNEL) =>
  (...args: ElectronBridgeAsyncApiRequest<CHANNEL>) =>
  new Promise<Awaited<ElectronBridgeAsyncApiResponse<CHANNEL>>>( (resolve, reject) => {
    // Create a code that allows us to match requests to responses
    const codeToMatch = `${Math.random()}:${Math.random()}`;
    // The response channel name is the name of the request channel type with suffix "-response" added
    const responseChannel = responseChannelNameFor(channel)
    // Create a listener function that will resolve the promise and stop listening when
    // the event code matches
    const responseListener = (_event: Electron.IpcRendererEvent, eventCode: string, response: ElectronBridgeAsyncApiResponse<CHANNEL>) => {
      if (eventCode === exceptionCodeFor(codeToMatch) ) {
        // The value is actually an exception and we should reject the promise.
        reject(response);
        ipcRenderer.removeListener(responseChannel, responseListener);
      } else if (eventCode === codeToMatch) {
        // The response code matches the request and so we should resolve the request
        resolve(response)
        ipcRenderer.removeListener(responseChannel, responseListener);
      }
    }
    // Start listening for response just before sending the request
    ipcRenderer.on(responseChannel, responseListener);
    // Send the request
    ipcRenderer.send(channel, codeToMatch, ...args);
  }) as ElectronBridgeAsyncApiResponse<CHANNEL>;

const createIpcListenerRequestClientFunction =
  <CHANNEL extends ElectronIpcListenerRequestChannelName>(channel: CHANNEL) =>
    (
      successCallback: ElectronBridgeListenerApiCallback<CHANNEL>,
      errorCallback: ElectronBridgeListenerApiErrorCallback<CHANNEL>,
      ...setupArgs: ElectronBridgeListenerApiSetupArgs<CHANNEL>
    ): RemoveListener => {
  // Create a code that allows us to match requests to responses
  const codeToMatch = `${Math.random()}:${Math.random()}`;
  // The response channel name is the name of the request channel type with suffix "-response" added
  const responseChannel = responseChannelNameFor(channel);
  // Create a listener function that will resolve the promise and stop listening when
  // the event code matches
  const responseListener = (_event: Electron.IpcRendererEvent, eventCode: string, ...response: any[]) => {
    if (eventCode === exceptionCodeFor(codeToMatch) ) {
      // The value is actually an exception and we should reject the promise.
      const errorResponseArgs = response as ElectronBridgeListenerApiErrorCallbackParameters<CHANNEL>;
      // Below line is hack for what seems like it must be a TypeScript bug, but maybe I'm just typing it wrong - Stuart 2021-06-3
      (errorCallback as (...params: ElectronBridgeListenerApiErrorCallbackParameters<CHANNEL>) => any) (...errorResponseArgs);
    } else if (eventCode === codeToMatch) {
      // The response code matches the request and so we should resolve the request
      const responseArgs = response as ElectronBridgeListenerApiCallbackParameters<CHANNEL>;
      // Below line is hack for what seems like it must be a TypeScript bug, but maybe I'm just typing it wrong - Stuart 2021-06-3
      (successCallback as (...params: ElectronBridgeListenerApiCallbackParameters<CHANNEL>) => any)(...responseArgs)
    }
  }
  // Create a function that will terminate the listener, notifying
  // the channel to shut it down on the other side.
  const terminateChannel = terminateChannelNameFor(channel);
  const terminateListener = () => {
    ipcRenderer.removeListener(responseChannel, responseListener);
    ipcRenderer.send(terminateChannel, codeToMatch);
  }
  // Start listening for response just before sending the request
  ipcRenderer.on(responseChannel, responseListener);
  // Send the request
  ipcRenderer.send(channel, codeToMatch, ...setupArgs);
  return terminateListener;
};

// Create the API to expose, using TypeScript to verify that we created everything correctly
const electronBridgeTypeChecked: IElectronBridge = {
  writeResultToStdOutAndExit: createIpcSyncRequestClientFunction("writeResultToStdOutAndExit"),
  getCommandLineArguments: createIpcSyncRequestClientFunction("getCommandLineArguments"),

  writeSeedToFIDOKey: createIpcAsyncRequestClientFunction("writeSeedToFIDOKey"),

  openFileDialog: createIpcAsyncRequestClientFunction("openFileDialog"),
  openMessageDialog: createIpcAsyncRequestClientFunction("openMessageDialog"),
  getDiceKey: createIpcAsyncRequestClientFunction("getDiceKey"),
  setDiceKey: createIpcAsyncRequestClientFunction("setDiceKey"),
  deleteDiceKey: createIpcAsyncRequestClientFunction("deleteDiceKey"),
  getStoredKeyList: createIpcAsyncRequestClientFunction("getStoredKeyList"),
  listenForSeedableSecurityKeys: createIpcListenerRequestClientFunction("listenForSeedableSecurityKeys"),
//  fix: {} as IElectronBridge["fix"]
};

// Expose the API
contextBridge.exposeInMainWorld('ElectronBridge', electronBridgeTypeChecked);
