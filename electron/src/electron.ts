import {app, dialog, BrowserWindow} from 'electron';
import * as IpcApiFactory from "./trusted-main-electron-process/IpcApiFactory";
import * as TrustedMainElectronProcess from "./trusted-main-electron-process";
import {squirrelCheck} from './electron-squirrel-startup';
import {createBrowserWindow} from "./createBrowserWindow";
import {registerAppLinkProtocol, sendAppLink} from "./trusted-main-electron-process/AppLinksApi";

// Force all the of APIs to lead by making the runtime environment
// inspect the count of the keys of the module.
if (Object.keys(TrustedMainElectronProcess).length === 0) {
  console.log(`TrustedMainElectronProcess has no keys`)
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (squirrelCheck()) {
    app.quit();
}

// Don't allow a second instance to open.
// Request a second instance lock, and if another process has that lock, it's the first
// instance and we should quit immediately.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}
// Below the above guard, we know our process is the first instance.

try {
    // When files used in the browser window are changed, the page is reloaded.
    require('electron-reloader')(module , {
        ignore : ['src', 'packaging', 'out'],
        debug: false
    });
    // The try/catch is needed so it doesn't throw Cannot find module 'electron-reloader' in production.
} catch {}

let mainWindow: BrowserWindow
function startApplication() {
    // Create the browser window.
    mainWindow = createBrowserWindow();
}

function bootstrapApplication() {
  // Register dicekeys uri scheme
  registerAppLinkProtocol()

  // Bootstrap if needed
  startApplication()
}

app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Protocol handler for win32
    // argv: An array of the second instance’s (command line / deep linked) arguments
    if (process.platform == 'win32') {
        // Keep only command line / deep linked arguments
        sendAppLink(commandLine.slice(1), mainWindow)
    }

    // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
}
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  bootstrapApplication()
})

app.on("activate", function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) startApplication()
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  // if (process.platform !== "darwin") {
  app.quit();
  // }
});

app.on('will-finish-launching', function() {
    // Protocol handler for osx
    app.on('open-url', function(event, url) {
        event.preventDefault()
        sendAppLink([url], mainWindow)
    })
})


// We're not currently using the dialog APIs.  If we were to, and we support multiple windows, we would
// want to keep a WindowID that let us associate the dialogs with the correct window ID?
// import {dialog} from 'electron';
IpcApiFactory.implementAsyncApi( "openFileDialog", (options) => dialog.showOpenDialog(mainWindow, options) );
IpcApiFactory.implementAsyncApi( "openMessageDialog", (options) => dialog.showMessageBox(mainWindow, options) );
