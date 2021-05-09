import css from "./RecipeBuilderView.css";
import React from "react";
import { observer  } from "mobx-react";
import { RecipeBuilderView } from ".";
import { RecipeBuilderState } from "./RecipeBuilderState";
import { RecipeTemplateSelectorView } from "./RecipeTemplateSelectorView";
import { DiceKey } from "~dicekeys/DiceKey";
import { DerivedFromRecipeView } from "./DerivedFromRecipeView";
import { DerivedFromRecipeState } from "./DerivedFromRecipeState";

interface DerivationViewProps {
  seedString: string;
}

export const DerivationViewWithState = observer( ( {recipeBuilderState, derivedFromRecipeState}: {
  recipeBuilderState: RecipeBuilderState
  derivedFromRecipeState: DerivedFromRecipeState
}) => (
  <div className={css.DerivationView}>
    <RecipeTemplateSelectorView {...{state: recipeBuilderState}} />
    <RecipeBuilderView state={recipeBuilderState} />
    <DerivedFromRecipeView {...{state: derivedFromRecipeState}} />
  </div>
));
export const DerivationView = observer ( (props: DerivationViewProps) => {
  const recipeBuilderState =  new RecipeBuilderState();
  const derivedFromRecipeState = new DerivedFromRecipeState({recipe: recipeBuilderState, seedString: props.seedString});
  return (
    <DerivationViewWithState {...{recipeBuilderState, derivedFromRecipeState}}/>
  )
});

export const Preview_DerivationView = () => (
  <DerivationView seedString={DiceKey.toSeedString(DiceKey.testExample, true) } />
)
// export const DerivationViewPreview 