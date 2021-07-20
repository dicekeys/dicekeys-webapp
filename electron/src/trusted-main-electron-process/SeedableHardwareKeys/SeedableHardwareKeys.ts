import {
  Device,
  DeviceListUpdateCallback,
  ErrorCallback,
  StopMonitoringFunction,
  UsbDeviceMonitor
} from "./UsbDeviceMonitor"
import {createIpcServer} from "./IpcServer";
import {runUsbCommandsInSeparateProcess, isUsbWriterProcess, isWin} from "../../usb";

const isUsbDeviceASeedableFIDOKey = ({vendorId, productId}: Device): boolean =>
(vendorId == 0x10c4 && productId == 0x8acf) ||
(vendorId == 0x0483 && productId == 0xa2ca);

var seedableFidoKeysMonitor: UsbDeviceMonitor | undefined;

/**
 * Monitor the USB bus for updates to the list of FIDO USB devices
 * that support seeding.
 * Do not use without consuming the return value (a function you need to call when done
 * monitoring or your process won't exit)
 *
 * @param deviceListUpdateCallback A callback to receive a list of USB devices when the
 * list is first fetched or when any changes occur
 * @param errorCallback A callback to receive any errors in fetching changes to the USB devices.
 * @returns A function that must be called when you are done monitoring the list of USB devices,
 * lest your process will refuse to exit.
 */
export const monitorForFidoDevicesConnectedViaUsb = (
  deviceListUpdateCallback: DeviceListUpdateCallback,
  errorCallback?: ErrorCallback
) : StopMonitoringFunction => {
  seedableFidoKeysMonitor = seedableFidoKeysMonitor ?? new UsbDeviceMonitor(isUsbDeviceASeedableFIDOKey);


  if((isWin || runUsbCommandsInSeparateProcess) && !isUsbWriterProcess){
    return createIpcServer(deviceListUpdateCallback, errorCallback)
  }

  return seedableFidoKeysMonitor.startMonitoring(deviceListUpdateCallback, errorCallback);
}
