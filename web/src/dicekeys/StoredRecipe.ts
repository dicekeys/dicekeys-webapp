import {DerivableObjectName, Recipe} from "@dicekeys/dicekeys-api-js"
import { describeRecipeType } from "../views/Recipes/DescribeRecipeType";
import { jsonStringifyWithSortedFieldOrder } from "../utilities/json";

export type DerivationRecipeType = DerivableObjectName

export interface StoredRecipe {
  readonly type: DerivationRecipeType;
  readonly name: string;
  readonly recipeJson: string;
}
export class BuiltInRecipe<NAME extends string = string> {
  constructor(
    public readonly type: DerivationRecipeType,
    public readonly name: NAME,
    public readonly recipeJson: string
  ) {
  }
}

export type LoadedRecipeOrigin = "BuiltIn" | "Saved" | "Template";

export interface LoadedRecipe<ORIGIN extends LoadedRecipeOrigin = LoadedRecipeOrigin, NAME extends string = string> {
  readonly origin: ORIGIN;
  readonly type: DerivationRecipeType;
  readonly name: ORIGIN extends "Saved" ? NAME : (NAME | undefined);
  readonly recipeJson: ORIGIN extends "Template" ? (string | undefined) : string;
}

export const BuiltInRecipes: StoredRecipe[] = [
	new BuiltInRecipe("Password", "1Password", `{"allow":[{"host":"*.1password.com"}]}`),
	new BuiltInRecipe("Password", "Apple", `{"allow":[{"host":"*.apple.com"},{"host":"*.icloud.com"}],"lengthInChars":64}`),
	new BuiltInRecipe("Password", "Authy", `{"allow":[{"host":"*.authy.com"}]}`),
	new BuiltInRecipe("Password", "Bitwarden", `{"allow":[{"host":"*.bitwarden.com"}]}`),
	new BuiltInRecipe("Password", "Facebook", `{"allow":[{"host":"*.facebook.com"}]}`),
	new BuiltInRecipe("Password", "Google", `{"allow":[{"host":"*.google.com"}]}`),
	new BuiltInRecipe("Password", "Keeper", `{"allow":[{"host":"*.keepersecurity.com"},{"host":"*.keepersecurity.eu"}]}`),
	new BuiltInRecipe("Password", "LastPass", `{"allow":[{"host":"*.lastpass.com"}]}`),
	new BuiltInRecipe("Password", "Microsoft", `{"allow":[{"host":"*.microsoft.com"},{"host":"*.live.com"}]}`)  
];


const savedPrefix = "saved:";
const builtInPrefix = "builtIn:";
const customPrefix = "custom:";
export type SavedRecipeIdentifier = `${typeof savedPrefix}${string}`;
export type BuiltInRecipeIdentifier = `${typeof builtInPrefix}${string}`;
export type CustomRecipeIdentifier = `${typeof customPrefix}${string}`;
export type RecipeIdentifier = SavedRecipeIdentifier | BuiltInRecipeIdentifier | CustomRecipeIdentifier;
export type PotentialRecipeIdentifier = RecipeIdentifier | string;
export const savedRecipeIdentifier = (storedRecipe: StoredRecipe) =>
  `${savedPrefix}${jsonStringifyWithSortedFieldOrder(storedRecipe)}` as SavedRecipeIdentifier;
export const builtInRecipeIdentifier = (storedRecipe: StoredRecipe) =>
  `${builtInPrefix}${jsonStringifyWithSortedFieldOrder(storedRecipe)}` as BuiltInRecipeIdentifier;
export const customRecipeIdentifier = (storedRecipe: Omit<StoredRecipe, "recipeJson" | "name">) =>
  `${customPrefix}${jsonStringifyWithSortedFieldOrder(storedRecipe)}` as CustomRecipeIdentifier;
export const isSavedRecipeIdentifier = 
  (recipeIdentifier?: SavedRecipeIdentifier | string): recipeIdentifier is SavedRecipeIdentifier =>
    !!(recipeIdentifier?.startsWith(savedPrefix));
export const isBuiltInRecipeIdentifier = 
  (recipeIdentifier?: BuiltInRecipeIdentifier | string): recipeIdentifier is BuiltInRecipeIdentifier =>
    !!(recipeIdentifier?.startsWith(builtInPrefix));
export const isCustomRecipeIdentifier = 
  (recipeIdentifier?: CustomRecipeIdentifier | string): recipeIdentifier is CustomRecipeIdentifier =>
    !!(recipeIdentifier?.startsWith(customPrefix));
export const savedRecipeIdentifierToStoredRecipe = 
  (identifier: SavedRecipeIdentifier) =>
    ({origin: "Saved", ...(JSON.parse(identifier.substr(savedPrefix.length)) as StoredRecipe)} as LoadedRecipe<"Saved">);
export const builtInRecipeIdentifierToStoredRecipe = 
  (identifier: BuiltInRecipeIdentifier) =>
    ({origin: "BuiltIn", ...(JSON.parse(identifier.substr(builtInPrefix.length)) as StoredRecipe)} as LoadedRecipe<"BuiltIn">);
export const customRecipeIdentifierToStoredRecipe = 
  (identifier: CustomRecipeIdentifier) => ({origin: "Template", ...JSON.parse(identifier.substr(customPrefix.length))}) as LoadedRecipe<"Template">;

export const storedRecipeIfSavedRecipeIdentifier =
(identifier: SavedRecipeIdentifier | string | undefined) =>
    (isSavedRecipeIdentifier(identifier) ? savedRecipeIdentifierToStoredRecipe(identifier) : undefined)  as (
      typeof identifier extends SavedRecipeIdentifier ? StoredRecipe : undefined
    );
export const storedRecipeIfBuiltInRecipeIdentifier =
  (identifier: BuiltInRecipeIdentifier | string | undefined) =>
    (isBuiltInRecipeIdentifier(identifier) ? builtInRecipeIdentifierToStoredRecipe(identifier) : undefined)  as (
      typeof identifier extends BuiltInRecipeIdentifier ? StoredRecipe : undefined
    );
export const storedRecipeIfCustomRecipeIdentifier =
  (identifier: CustomRecipeIdentifier | string | undefined) =>
    (isCustomRecipeIdentifier(identifier) ? customRecipeIdentifierToStoredRecipe(identifier) : undefined)  as (
      typeof identifier extends CustomRecipeIdentifier ? StoredRecipe : undefined
    );
export const getStoredRecipe = (recipeIdentifier?: PotentialRecipeIdentifier): LoadedRecipe | undefined => {
  return storedRecipeIfSavedRecipeIdentifier(recipeIdentifier) ??
    storedRecipeIfBuiltInRecipeIdentifier(recipeIdentifier) ??
    storedRecipeIfCustomRecipeIdentifier(recipeIdentifier);
}

export type DiceKeysAppSecretRecipe = Recipe & {
  // FIXME -- definition of recipe out of date in API, fix that and remove this hack
  lengthInChars?: number;
  lengthInBytes?: number;
  // Sequence numbers
  '#'?: number;
  purpose?: string;
}

export const getStoredRecipeNameSuffix = (storedRecipe: Partial<StoredRecipe>): string => {
  const {type, recipeJson} = storedRecipe;
  if (!type || !recipeJson) return "";
  try {
    const recipe = JSON.parse(recipeJson) as DiceKeysAppSecretRecipe;
    const {lengthInBytes, lengthInChars} = recipe;
    const sequenceNumber = recipe["#"];
    return `${describeRecipeType(type)}${
          lengthInBytes == null ? "" : ` (${lengthInBytes} bytes)`
      }${ lengthInChars == null ? "" : ` (${lengthInChars} chars)`
      }${ sequenceNumber == null ? "" : ` #${sequenceNumber}`
    }`;
  } catch {
    return describeRecipeType(type);
  }
}

export const enhancedStoredRecipeName = (storedRecipe: StoredRecipe): string => {
  const {name} = storedRecipe;
  return `${name} ${getStoredRecipeNameSuffix(storedRecipe)}`;
}

export const isRecipeBuiltIn = (storedRecipe: Partial<StoredRecipe>): boolean =>
  !!BuiltInRecipes.find( savedRecipe =>
    storedRecipe.recipeJson === savedRecipe.recipeJson &&
    storedRecipe.type === savedRecipe.type  &&
    storedRecipe.name === savedRecipe.name
  )

// const commaSeparatedHostsToBuiltInRecipe = BuiltInRecipes.reduce( (result, savedRecipe) => {
//   const hosts = recipeJsonToHosts(savedRecipe.recipeJson);
//   if (hosts.length > 0) {
//     result[hosts.join(",")] = savedRecipe
//   }
//   return result
// }, {} as Record<string, StoredRecipe>);

// export const purposeToBuiltInRecipe = (purposeField?: string): StoredRecipe | undefined => {
//   const hosts = purposeToListOfHosts(purposeField);
//   if (hosts == null) return undefined;
//   return commaSeparatedHostsToBuiltInRecipe[hosts.join(",")];
// }
