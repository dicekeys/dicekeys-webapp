import * as TrustedMainElectronProcess from "./trusted-main-electron-process";
import {monitorForFidoDevicesConnectedViaUsb} from "./trusted-main-electron-process/SeedableHardwareKeys/SeedableHardwareKeys";
import {app} from "electron";


// Force all the of APIs to lead by making the runtime environment
// inspect the count of the keys of the module.
if (Object.keys(TrustedMainElectronProcess).length === 0) {
    console.log(`TrustedMainElectronProcess has no keys`)
};

app.whenReady().then(() => {
    // Just for testing purposes
// you can spawn it with node
    monitorForFidoDevicesConnectedViaUsb((devices) => {
        console.log(devices)
    }, (err) => {
        console.log(err)
    })
})
