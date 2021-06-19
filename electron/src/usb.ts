export const isWin = process.platform == "win32"
export const alwaysSpawnClient = true // a way to test is with macos / linux
export const isUsbWriterProcess = process.argv[1].indexOf('usb-writer') != -1
