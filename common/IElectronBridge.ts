import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  MessageBoxOptions,
  MessageBoxReturnValue
} from "electron";

export {
  OpenDialogOptions,
  OpenDialogReturnValue,
  MessageBoxOptions,
  MessageBoxReturnValue
}

export interface Device {
  locationId: number;
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturer: string;
  serialNumber: string;
  deviceAddress: number;
}

export interface IElectronBridgeSync {
  writeResultToStdOutAndExit(result: string): void;
  getCommandLineArguments(): string[];
}

export  interface IElectronBridgeAsync {
  openFileDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  openMessageDialog(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
}

export type RemoveListener = () => void;
export interface IElectronBridgeListener {
  listenForSeedableSecurityKeys(successCallback: (devices: Device[]) => any, errorCallback: (error: any) => any): RemoveListener;
// for testing typings only  fix(sc: (a: string, b: number) => any, ec: (error: any) => any): RemoveListener;
}

export interface IElectronBridge extends IElectronBridgeSync, IElectronBridgeAsync, IElectronBridgeListener {
}
