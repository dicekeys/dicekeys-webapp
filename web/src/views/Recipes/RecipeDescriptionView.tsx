import React from "react";
import { AndClause } from "../basics";
import { DerivationRecipeType, DiceKeysAppSecretRecipe } from "../../dicekeys";
import { describeRecipeType } from "./DescribeRecipeType";
import css from "./Recipes.module.css";
import { observer } from "mobx-react";

interface RecipeState {
  type?: DerivationRecipeType;
  recipeJson?: string;
  recipeIsValid: boolean;
}


const HostNameView = ({host}: {host: string}) => (
  host.startsWith("*.") ?
  (<><span className={css.host_name_span}>{ host.substring(2) }</span> (and its subdomains)</>) :
  (<><span className={css.host_name_span}>{ host }</span> (but not its subdomains)</>)
)

export const RecipeDescriptionContentView = observer ( ({state}: {state: RecipeState}) => {
  const {type, recipeJson, recipeIsValid} = state;
  if (type == null || recipeJson == null || !recipeIsValid) return (<i>Enter a purpose for the recipe.</i>);
  let recipe: DiceKeysAppSecretRecipe | undefined = (() => {
    try {
      return JSON.parse(recipeJson ?? "{}") as DiceKeysAppSecretRecipe;
    } catch {
      return undefined;
    }
  })();
  if (recipe == null) {
    return (<><i>Improperly formatted JSON {describeRecipeType(type).toLocaleLowerCase()} recipe</i></>);
  }
  const withClauses: JSX.Element[] = [];
  if (type === "Password" && recipe.lengthInChars) {
    withClauses.push((<> a maximum length of <span className={css.length_span}>{ recipe.lengthInChars }</span> characters</>));
  }
  if (recipe["#"]) {
    withClauses.push((<> sequence number <span className={css.sequence_number_span}>{recipe["#"]}</span></>));
  }  
  return (
    <>Creates a {describeRecipeType(type).toLocaleLowerCase()}
      { !recipe.purpose ? null : (
        <> for the purpose of &lsquo;<span className={css.host_name_span}>{ recipe.purpose }</span>&rsquo;</>
      )}{ !recipe.allow || recipe.allow.length == 0 ? null : (
        <> for use by <AndClause items={recipe.allow.map( ({host}) => (<HostNameView {...{host}}/>)
          )}/>
        </>)
      }{ withClauses.length == 0 ? null : (
        <> with <AndClause items={withClauses}/></>
      )}.</>
  );
});

export const RecipeDescriptionView = (props: {state: RecipeState}) => (
  <div className={css.RecipeDescriptionView} >
    <RecipeDescriptionContentView {...props} />
  </div>
)