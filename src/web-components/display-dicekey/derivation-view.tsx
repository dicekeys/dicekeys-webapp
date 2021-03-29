import React from "react";
import { observer  } from "mobx-react";
import { RecipeBuilderView } from "../recipe-builder/";


interface DerivationViewProps {
  seedString: string;
}


export const DerivationView = observer( ( props: DerivationViewProps) => {
  return (
      <RecipeBuilderView seedString={props.seedString} />
  );
});
