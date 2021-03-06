import { observer } from "mobx-react";
import React from "react";
import {WindowTopLevelNavigationState} from "../state/Window";
import Layout from "../css/Layout.module.css";
import css from "./WindowHomeView.module.css";

import LoadDiceKeyImage from /*url:*/"../images/Scanning a DiceKey.svg";
import AssemblyImage1 from /*url:*/"../images/Illustration of shaking bag.svg";
import AssemblyImage2 from /*url:*/"../images/Box Bottom After Roll.svg";
import AssemblyImage3 from /*url:*/"../images/Seal Box.svg";

interface WindowHomeViewProps {
  windowNavigationState: WindowTopLevelNavigationState;
}
export const WindowHomeView = observer ( (props: WindowHomeViewProps) => {
  const {windowNavigationState} = props;
  return (
    <div className={Layout.ColumnCentered}>
      {/* 
        Load DiceKey button
        */}
      <button className={css.SubViewButton}
        onClick={ windowNavigationState.navigateToLoadDiceKey }
      >
        <img src={LoadDiceKeyImage} className={css.SubViewButtonImage} />
        <div className={css.SubViewButtonLabel}>Load DiceKey</div>
      </button>
      {/* 
        Assembly instructions button
        */}
      <button className={css.SubViewButton}
        onClick={ windowNavigationState.navigateToAssemblyInstructions }
      >
        <div className={css.ImageRow}>
          <img src={AssemblyImage1} className={css.SubViewButtonImage} />
          <img src={AssemblyImage2} className={css.SubViewButtonImage} />
          <img src={AssemblyImage3} className={css.SubViewButtonImage} />
        </div>
        <div className={css.SubViewButtonLabel}>Assembly Instructions</div>
      </button>
    </div>
  )
});
