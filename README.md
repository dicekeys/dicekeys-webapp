# DiceKeys TypeScript App for DiceKeys.app and Electron

## Requirements

## Running web app locally
Tested to work with Node.js LTS v14.

Install [TypeScript](https://www.typescriptlang.org/download) in your system.
```
npm install -g typescript
```

Install [Parcel](https://parceljs.org/) in your system.
```
npm install -g parcel-bundler
```

Make sure you have access to [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token).
(add you personal token to ~/.npmrc)

Install modules
```
cd web
npm install
```
_If `npm` fails, check **GitHub Packages** instructions._

```
npm run start
```

## Running electron app
```
cd common
npm run build
cd ..
cd web
npm install
npm run build-electron-html
cd ../electron
npm install
npm run start
```
## Build electron app for macOS

First do all the steps before `npm run start` above
```
cd electron
npm run make
```

## Build electron app for Windows/Linux

Create the build image
```
cd electron
docker build -f Dockerfile . --tag dicekeys_build
```

Create **deb**, **rpm** and **zip**. Output files resides in `out` folder.
```
cd electron
docker run --rm -v $PWD:/dicekeys dicekeys_build
```


## Run tests
```
jest
```

## Architecture

The app uses a reactive-style of UI coding in which code is divided into:
  - State objects, which represent the current state of the application, and
  - Views, which render mostly-stateless UI components to reflect the application state.

Global state is under the `state` directory and `views` are under the views directory.
State-objects that are local to one or more views may be stored adjacent to their view.

State is managed with MobX, and state classes contain actions (methods) that will modify state.

MobX-enhanced React components automatically re-render views as needed when state changes.
We inject state into these components through their React props (React's name for the parameters passed to a view by its parent).

We borrow from environments like SwiftUI, which allow you to run and inspect individual components by rendering previews, by manually
creating preview HTML files for key components that operate only on the subset of the application state that required for those views.

```
parcel src/preview.html
```
Then load [http://localhost:1234/](http://localhost:1234/)


### Windows USB device handling
Windows require the app to have admin rights in order to list usb devices and write to them.
When the app runs on windows it creates an IPC (named pipes) and executes a script (`usb-writer.js`) with elevated priviledges (UAC)
that listens to the parent IPC.

For easier development `alwaysSpawnClient` can be set to `true` for all OS's to spawn an IPC server even if is not required.

## Security notes

### Dependencies

Due to our strict security requirements, we try to minimize dependencies.  The only non-dev components we use are our own support libraries
  - our own `SeededCrypto` library, built on `LibSodium`
  - our DiceKey scanning library, built on `OpenCV`
  - `emscripten`, the WebAssembly compiler used to build the above two libraries and marshall data
  - `React`, the highly-popular UI library with a great security track record.
  - `MobX`, not quite as popular as React, but a small code base with a great security track record.
  - `parcel` generates code during the build process and relies on other dependencies.
  
Testing with `jest` introduces other dependencies, but those should not be compiled into the production applications.


## Build notes

Using parcel v2 to build.  Ran into problems with CSS that required using the nightly build.


Currently must use the TypeScript compiler and avoiding babel per [mobx](https://mobx.js.org/installation.html) requirement to set `"useDefineForClassFields": true`

At some point we may want to add this to the .parcelrc, but for now we're typechecking in vscode
and with tsc, and this isn't working well in the beta of parcel 2.


```
  "validators": {
    "*.{ts,tsx}": ["@parcel/validator-typescript"]
  }
```

## Electron notes

### Electron Version locking
Electron version has a dependency on `node-hid` and as a result Electron version must first be supported by `node-hid`.

### Development mode
#### Refresh HTML contents

You can run _web_ codebase with the following commands. Any change to the html files will trigger an update to the electron html contents without restarting the application itself.
```
cd web
npm run watch-electron-html
```

#### Restart Electron
Restarting electron every time there is a change in the _electron_ codebase can be accomplished by running the following commands in two separates terminal windows.
```
cd electron
npm run watch
```

```
cd electron
npm run start-electron
```
