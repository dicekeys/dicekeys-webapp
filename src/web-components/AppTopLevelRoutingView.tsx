import { observer } from "mobx-react";
import React from "react";
import { DiceKey } from "../dicekeys/dicekey";
import {AppTopLevelState, SubViewsOfTopLevel} from "../state/navigation";
import { SelectedDiceKeyView } from "./selected-dicekey/selected-dicekey-view";
import { AppHomeView } from "./AppHomeView";
import { LoadDiceKeyView, LoadDiceKeyState } from "./reading-dicekeys/LoadDiceKeyView";

const DefaultAppTopLevelState = new AppTopLevelState();

interface AppTopLevelRoutingViewProps {
  appTopLevelState?: AppTopLevelState;
}
export const AppTopLevelRoutingView = observer ( (props: AppTopLevelRoutingViewProps) => {
  const appTopLevelState = props.appTopLevelState ?? DefaultAppTopLevelState;
  const onDiceKeyRead = (diceKey: DiceKey) => {
    appTopLevelState.navigateToSelectedDiceKeyView(diceKey);
  }

  switch (appTopLevelState.subView) {
    case SubViewsOfTopLevel.AppHomeView: return (
      <AppHomeView {...{appTopLevelState}}/>
    );
    case SubViewsOfTopLevel.LoadDicekey: return (
      <LoadDiceKeyView onDiceKeyRead={ onDiceKeyRead } state={new LoadDiceKeyState("manual")} />
    )
    case SubViewsOfTopLevel.AssemblyInstructions: return (
      null
    )
    case SubViewsOfTopLevel.DiceKeyView: return (
      <SelectedDiceKeyView onBack={ () => appTopLevelState.navigateToTopLevelView() } navigationState={appTopLevelState.selectedDiceKeyViewState!} />
    );
  }
});
