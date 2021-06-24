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

export interface DeviceUniqueIdentifier {
  vendorId: number;
  productId: number;
  serialNumber: string;  
}

export interface Device extends DeviceUniqueIdentifier {
  locationId: number;
  deviceName: string;
  manufacturer: string;
  deviceAddress: number;
}

export interface IElectronBridgeSync {
  writeResultToStdOutAndExit(result: string): void;
  getCommandLineArguments(): string[];
}

export type WriteSeedToFIDOKeyException = 
  "UserDidNotAuthorizeSeeding" |
  "SeedShouldBe32Bytes" |
  "ExtStateShouldNotExceed256Bytes" |
  "KeyDoesNotSupportSeedingVersion" |
  "KeyDoesNotSupportCommand" |
  "KeyReportedInvalidLength" |
  `UnknownSeedingException` |
  `UnknownSeedingException:${ string }`;
export interface IElectronBridgeSeedingAsync {
  writeSeedToFIDOKey: (deviceIdentifier: DeviceUniqueIdentifier, seedAs32BytesIn64CharHexFormat: string, extStateHex?: string) => Promise<"success">
}

export interface IElectronBridgeDialogsAsync{
  openFileDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
  openMessageDialog(options: MessageBoxOptions): Promise<MessageBoxReturnValue>;
}
export interface IElectronBridgeDiceKeysStoreAsync {
  getDiceKey(id: string): Promise<string | null>;
  setDiceKey(id: string, humanReadableForm: string): Promise<void>;
  deleteDiceKey(id: string): Promise<boolean>
  getStoredKeyList: () => Promise<{centerLetterAndDigit: string, keyId: string}[]>;
}

export type RemoveListener = () => void;
export interface IElectronBridgeListener {
  listenForSeedableSecurityKeys(successCallback: (devices: Device[]) => any, errorCallback: (error: any) => any): RemoveListener;
// for testing typings only  fix(sc: (a: string, b: number) => any, ec: (error: any) => any): RemoveListener;
}

export interface IElectronBridgeAsync extends
  IElectronBridgeDialogsAsync,
  IElectronBridgeDiceKeysStoreAsync,
  IElectronBridgeSeedingAsync
{}

export interface IElectronBridge extends IElectronBridgeSync, IElectronBridgeAsync, IElectronBridgeListener {
}

