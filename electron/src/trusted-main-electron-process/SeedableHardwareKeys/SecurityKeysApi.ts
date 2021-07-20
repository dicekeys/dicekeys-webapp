import * as IpcApiFactory from "../IpcApiFactory"
import { monitorForFidoDevicesConnectedViaUsb } from './SeedableHardwareKeys';
import {writeSeedToFIDOKey} from "./SeedHardwareKey";

IpcApiFactory.implementListenerApi("listenForSeedableSecurityKeys", monitorForFidoDevicesConnectedViaUsb);
IpcApiFactory.implementAsyncApi("writeSeedToFIDOKey", writeSeedToFIDOKey);
