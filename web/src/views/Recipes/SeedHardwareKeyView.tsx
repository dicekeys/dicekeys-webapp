import css from "./Recipes.module.css";
import React, { useEffect, useState } from "react";
import { observer  } from "mobx-react";
import { CenteredControls, ContentBox, Instruction, PaddedContentBox, Spacer } from "../basics";
import { RecipeFieldsHelpView, RecipeBuilderFieldsView, RecipeRawJsonView } from "./RecipeBuilderView"
import { DerivedFromRecipeView } from "./DerivedFromRecipeView";
import { RecipeBuilderState } from "./RecipeBuilderState";
import { DerivedFromRecipeState } from "./DerivedFromRecipeState";

const seedSecurityKeyPurpose = "seedSecurityKey";


import {
  IElectronBridge,
  Device,
  DeviceUniqueIdentifier,
  WriteSeedToFIDOKeyException
} from "../../../../common/IElectronBridge";
import { action, makeAutoObservable } from "mobx";
import { isElectron } from "../../utilities/is-electron";
import { LoadedRecipe } from "../../dicekeys/StoredRecipe";


class SeedableDiceKeys {
  destructor?: () => void;
  devices?: Device[] = undefined;
  setDevices = action ((devices: Device[]) => {
    this.devices = devices
  });
  error?: any;
  setError = action ((error: any) => {
    this.error = error;
  });

  constructor() {
    const {ElectronBridge} = window as {ElectronBridge?: IElectronBridge}
    this.destructor = ElectronBridge?.listenForSeedableSecurityKeys( this.setDevices, this.setError );
    makeAutoObservable(this);
  }

  destroy() {
    this.destructor?.();
  }
}

export const HardwareSecurityKeysView = observer ( ({seedableDiceKeys, seedHardwareKeyViewState}: {
  seedableDiceKeys: SeedableDiceKeys,
  seedHardwareKeyViewState: SeedHardwareKeyViewState
}) => {
  const {devices} = seedableDiceKeys;
  const {ElectronBridge} = window as {ElectronBridge?: IElectronBridge}
  if (devices == null || ElectronBridge == null) return null;
  return (
    <div className={css.SeedingContentBlock}>
      { devices.map( device => (
        <button
          key={device.serialNumber}
          onClick={ () => seedHardwareKeyViewState.write({...device}) }
        >Seed {device.deviceName} ({device.serialNumber})
        </button>
      ))}
    </div>
)}
);

export const CannotSeedSecurityKeysView = () => (
  <div className={css.CannotSeedContentBlock}>
    Web browsers currently prevent web-based applications from using USB to seed hardware security keys.
    <br/>
    To seed a security key, you'll need to use the DiceKeys app on Android, Windows, Linux, or MacOS.
  </div>
)

export const PressCountdownSecondsView = observer( ({whenStarted}: {whenStarted: number}) => {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval( () => setNow(Date.now()), 1000);
    return () => { clearInterval(interval)}
  });
  const secondsPassed = Math.floor((now - whenStarted) / 1000)
  return (<>{ Math.max(0, 8 - secondsPassed) }</>);
})

export const SeedHardwareKeyViewWithState = observer( ( {seedHardwareKeyViewState, seedableDiceKeys}: {
  seedHardwareKeyViewState: SeedHardwareKeyViewState,
  seedableDiceKeys: SeedableDiceKeys,
}) => {
  if (seedHardwareKeyViewState.writeInProgress) {
    return (
      <PaddedContentBox>
        <Spacer/>
        <Instruction>Press the button on your hardware key three times to complete the seeding process.</Instruction>
        <Instruction>You have <PressCountdownSecondsView whenStarted={ Date.now() }/> seconds to do so.</Instruction>
        <Spacer/>
      </PaddedContentBox>
    )  
  } else if (seedHardwareKeyViewState.writeError != null) {
    return (
      <PaddedContentBox>
        <Spacer/>
        <Instruction>{( () => {
          switch(seedHardwareKeyViewState.writeError) {
            case "UserDidNotAuthorizeSeeding": return `Your hardware key reported that you did not triple-click the button in time. `
            case "KeyDoesNotSupportCommand": return "Your hardware key's firmware does not support seeding."
            case "KeyDoesNotSupportSeedingVersion": return `Your hardware key's firmware does not support this seeding command version.`
            case "KeyReportedInvalidLength": return `Your hardware key reported that the seed length was incorrect.`;
            default: return `Internal error ${seedHardwareKeyViewState.writeError}`;
          }
        })()}          
        </Instruction>
        <Spacer/>
        <CenteredControls><button onClick={seedHardwareKeyViewState.resetWriteState } >Dismiss</button></CenteredControls>
      </PaddedContentBox>
    )  
  } else if (seedHardwareKeyViewState.writeSucceeded) {
    return (
      <PaddedContentBox>
        <Spacer/>
        <Instruction>Your key has been written.</Instruction>
        { JSON.stringify( seedHardwareKeyViewState.writeError) }        
        <Spacer/>
        <CenteredControls><button onClick={seedHardwareKeyViewState.resetWriteState } >Okay</button></CenteredControls>
      </PaddedContentBox>
    )  
  } else return (
    <ContentBox>
      <Spacer/>
      <div className={css.DerivationView}>
        <div className={css.RecipeFormFrame}>
          <RecipeFieldsHelpView state={seedHardwareKeyViewState.recipeBuilderState} />
          <RecipeBuilderFieldsView state={seedHardwareKeyViewState.recipeBuilderState} />
          <RecipeRawJsonView state={seedHardwareKeyViewState.recipeBuilderState} /> 
        </div>
        <DerivedFromRecipeView state={seedHardwareKeyViewState.derivedFromRecipeState} />
        {/* <Spacer/> */}
        { isElectron() != null ? (
          <HardwareSecurityKeysView {...{seedableDiceKeys, seedHardwareKeyViewState}}/>
        ) : (
          <CannotSeedSecurityKeysView/>
        )}
      </div>
      <Spacer/>
    </ContentBox>
  )
});

class SeedHardwareKeyViewState {
  recipeBuilderState: RecipeBuilderState;
  derivedFromRecipeState: DerivedFromRecipeState;
  constructor(public readonly seedString: string) {
    const recipeBuilderState = new RecipeBuilderState({
      origin: "BuiltIn",
//      name: "",
      type: "Secret",
      recipeJson: `{"purpose":"${seedSecurityKeyPurpose}"}`,// purpose: ,
    } as LoadedRecipe<"BuiltIn">);
    const derivedFromRecipeState = new DerivedFromRecipeState({recipeState: recipeBuilderState, seedString});
    this.recipeBuilderState = recipeBuilderState;
    this.derivedFromRecipeState = derivedFromRecipeState;
    makeAutoObservable(this);
  }

  writeInProgress: boolean = false;
  writeSucceeded?: boolean;
  writeError?: WriteSeedToFIDOKeyException | undefined;
  resetWriteState = action ( () => {
    this.writeInProgress = false;
    this.writeError = undefined;
    this.writeSucceeded = undefined;
  });
  setWriteStarted = action ( () => {
    this.writeInProgress = true;
    this.writeError = undefined;
    this.writeSucceeded = undefined;
  });
  setWriteError = action ( (error: any) => {
    this.writeInProgress = false
    this.writeError = error;
    this.writeSucceeded = false;;
  });
  setWriteSucceeded = action ( () => {
    this.writeInProgress = false;
    this.writeError = undefined;
    this.writeSucceeded = true;
  });

  write = (deviceIdentifier: DeviceUniqueIdentifier) => {
    const seed = this.derivedFromRecipeState.derivedSeedBytesHex;
    const {ElectronBridge} = window as {ElectronBridge?: IElectronBridge}
    if (!seed || !ElectronBridge) return;
    this.setWriteStarted();
    ElectronBridge.writeSeedToFIDOKey(deviceIdentifier, seed)
      .then( () => this.setWriteSucceeded() )
      .catch ( this.setWriteError );
  }
}

export const SeedHardwareKeyView = observer ( (props: {seedString: string}) => {
  const seedHardwareKeyViewState = new SeedHardwareKeyViewState(props.seedString);
  const seedableDiceKeys = new SeedableDiceKeys();
  useEffect( () => () => seedableDiceKeys.destroy() );  

  return (
    <SeedHardwareKeyViewWithState {...{seedHardwareKeyViewState, seedableDiceKeys}}/>
  )
});

