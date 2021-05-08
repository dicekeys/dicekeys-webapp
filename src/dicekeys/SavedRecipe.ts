import {DerivableObjectName, Recipe} from "@dicekeys/dicekeys-api-js"
import { getRegisteredDomain, isValidDomain } from "../domains/get-registered-domain";

export type DerivationRecipeType = DerivableObjectName

export class SavedRecipe {
  constructor(
    public readonly type: DerivationRecipeType,
    public readonly name: string,
    public readonly recipeJson: string
  ) {
  }
}

export const BuiltInRecipes: SavedRecipe[] = [
	new SavedRecipe("Password", "1Password", `{"allow":[{"host":"*.1password.com"}]}`),
	new SavedRecipe("Password", "Apple", `{"allow":[{"host":"*.apple.com"},{"host":"*.icloud.com"}],"lengthInChars":64}`),
	new SavedRecipe("Password", "Authy", `{"allow":[{"host":"*.authy.com"}]}`),
	new SavedRecipe("Password", "Bitwarden", `{"allow":[{"host":"*.bitwarden.com"}]}`),
	new SavedRecipe("Password", "Facebook", `{"allow":[{"host":"*.facebook.com"}]}`),
	new SavedRecipe("Password", "Google", `{"allow":[{"host":"*.google.com"}]}`),
	new SavedRecipe("Password", "Keeper", `{"allow":[{"host":"*.keepersecurity.com"},{"host":"*.keepersecurity.eu"}]}`),
	new SavedRecipe("Password", "LastPass", `{"allow":[{"host":"*.lastpass.com"}]}`),
	new SavedRecipe("Password", "Microsoft", `{"allow":[{"host":"*.microsoft.com"},{"host":"*.live.com"}]}`)  
];

const addFieldToEndOfJsonObjectString = (fieldName: string, quote: boolean = false, doNotAddIfValueIs: string | number | undefined = undefined) =>
  (originalJsonObjectString: string | undefined, fieldValue?: string | number): string | undefined => {
  if (typeof fieldValue == "undefined" || fieldValue == doNotAddIfValueIs) return originalJsonObjectString;
  const srcString = (typeof originalJsonObjectString === "undefined" || originalJsonObjectString.length === 0) ? "{}" : originalJsonObjectString;
  const lastClosingBraceIndex = srcString.lastIndexOf("}");
  if (lastClosingBraceIndex < 0) {return srcString }
  const prefixUpToFinalClosingBrace = srcString.substr(0, lastClosingBraceIndex);
  const suffixIncludingFinalCloseBrace = srcString.substr(lastClosingBraceIndex);
  const commaIfObjectNonEmpty = srcString.indexOf(":") > 0 ? "," : "";
  const fieldValueString = typeof fieldValue == "string" && quote ? `"${fieldValue.replace(/\"/g, "\\\"")}"` : `${fieldValue}`;
  return prefixUpToFinalClosingBrace + `${commaIfObjectNonEmpty}"${fieldName}":${fieldValueString}` + suffixIncludingFinalCloseBrace;
}

export const addLengthInBytesToRecipeJson: <T extends string | undefined>(recipeWithoutLengthInBytes: T, lengthInBytes?: number) => string | undefined = addFieldToEndOfJsonObjectString("lengthInBytes", false, 32); 
export const addLengthInCharsToRecipeJson: <T extends string | undefined>(recipeWithoutLengthInChars: T, lengthInChars?: number) => string | undefined = addFieldToEndOfJsonObjectString("lengthInChars", false, 0); 
export const addSequenceNumberToRecipeJson: <T extends string | undefined>(recipeWithoutSequenceNumber: T, sequenceNumber?: number) => string | undefined = addFieldToEndOfJsonObjectString("#", false, 1);
export const addPurposeToRecipeJson: <T extends string | undefined>(recipeWithoutPurpose: T, purpose?: string) => string | undefined = addFieldToEndOfJsonObjectString("purpose", true);
export const addAllowToRecipeJson: <T extends string | undefined>(recipeWithoutAllow: T, allow?: string) => string | undefined = addFieldToEndOfJsonObjectString("allow", false);

const getHostRestrictionsArrayAsString = (hosts: string[]): string =>
  `[${hosts
        .map( host => `{"host":"*.${host}"}` )
        .join(",")
    }]`;

export const addHostsToRecipeJson = (recipeWithoutAllow: string | undefined, hosts: string[]): string | undefined => {
  if (hosts.length === 0) return recipeWithoutAllow;
  const allow = getHostRestrictionsArrayAsString(hosts.sort());
  return addAllowToRecipeJson(recipeWithoutAllow, allow);
}

export type DiceKeysAppSecretRecipe = Recipe & {
  // FIXME -- definition of recipe out of date in API, fix that and remove this hack
  lengthInChars?: number;
  lengthInBytes?: number;
  // Sequence numbers
  '#'?: number;
  purpose?: string;
}

export type RecipeFieldType = keyof DiceKeysAppSecretRecipe;

interface AddableRecipeFields {
  hosts?: string[];
  purpose?: string;
  lengthInBytes?: number;
  lengthInChars?: number;
  sequenceNumber?: number;
}

const recipeJsonToHosts = (recipeJson: string | undefined): string[] => {
  const {allow} = (JSON.parse(recipeJson ?? "{}") as DiceKeysAppSecretRecipe);
  return allow == null ? [] : allow.map( ({host}) => {
      host = host.trim();
      return host.startsWith("*.") ? host.substr(2) : host 
    }
  )
  .filter( host => host.length > 0 )
  .sort();
}

const commaSeparatedHostsToBuiltInRecipe = BuiltInRecipes.reduce( (result, savedRecipe) => {
  const hosts = recipeJsonToHosts(savedRecipe.recipeJson);
  if (hosts.length > 0) {
    result[hosts.join(",")] = savedRecipe
  }
  return result
}, {} as Record<string, SavedRecipe>);

export const purposeToListOfHosts = (purposeField: string | undefined): string[] | undefined => {
  if (purposeField == null) return;
  try {
    const hosts = (purposeField).split(",")
      .map( i => {
        const potentialHostName = i.trim();
        if (potentialHostName.length == 0) return;
        // Get JavaScript's URL parser to validate the hostname for us
        if (isValidDomain(potentialHostName)) {
          return getRegisteredDomain(potentialHostName);
        } else throw "not a valid host name"
      })
      .filter( i =>  i != null && i.length > 0 ) as string[];
    if (hosts.length > 0) {
      return hosts;
    }
  } catch {}
  return undefined;
}

export const purposeToBuiltInRecipe = (purposeField?: string): SavedRecipe | undefined => {
  const hosts = purposeToListOfHosts(purposeField);
  if (hosts == null) return undefined;
  return commaSeparatedHostsToBuiltInRecipe[hosts.join(",")];
}

export const getRecipeJson = (spec: AddableRecipeFields, template?: string): string | undefined => {
  const {hosts, purpose, lengthInBytes, lengthInChars, sequenceNumber} = spec;
  const templateRecipe = template == null ? {} : JSON.parse(template) as DiceKeysAppSecretRecipe;
  // The recipe starts with the JSON template.

  let recipeJson: string | undefined = template;
  // IMPORTANT -- changes must be applied in the correct order for JSON
  // fields to be ordered correctly and to be consistent between platforms.

  // Apply addition of hosts
  if (templateRecipe.allow == null && hosts) {
    recipeJson = addHostsToRecipeJson(recipeJson, hosts);
  }

  // Apply addition of purpose
  if (templateRecipe.purpose == null && purpose != null && purpose.length > 0) {
    recipeJson = addPurposeToRecipeJson(recipeJson, purpose);
  }

  // Apply addition of lengthInBytes
  if (templateRecipe.lengthInBytes == null && lengthInBytes != null) {
    recipeJson = addLengthInBytesToRecipeJson(recipeJson, lengthInBytes);
  }

  // Apply addition of lengthInChars (passwords only)
  if (templateRecipe.lengthInChars == null && lengthInChars != null) {
    recipeJson = addLengthInCharsToRecipeJson(recipeJson, lengthInChars);
  }

  // Apply addition of sequence number
  if (templateRecipe["#"] == null && sequenceNumber != null && sequenceNumber > 1) {
    recipeJson = addSequenceNumberToRecipeJson(recipeJson, sequenceNumber);
  }
  return recipeJson;
}