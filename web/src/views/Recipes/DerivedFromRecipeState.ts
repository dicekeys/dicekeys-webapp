import { action, makeAutoObservable } from "mobx";
import {DerivationRecipeType} from "../../dicekeys/StoredRecipe";
import { CachedApiCalls } from "../../api-handler/CachedApiCalls";
import { isValidJson } from "../../utilities/json";
import { SeededCryptoModulePromise } from "@dicekeys/seeded-crypto-js";
import { AsyncCalculation } from "../../utilities/AsyncCalculation";

const spaceJson = (spaces: number = 2) => (json: string | undefined): string | undefined => {
  return (json == null) ? json : JSON.stringify(JSON.parse(json), undefined, spaces);
}
const doubleSpaceJson = spaceJson(2);

export const OutputFormats = {
  "Password": ["Password", "JSON"],
  "Secret": ["JSON", "Hex", "BIP39"],
  "SigningKey": [
    "JSON",
    "OpenPGP Private Key",
    "OpenSSH Private Key",
    "OpenSSH Public Key",
    "Hex (Signing Key)",
    /* "Hex (Signature-Verification Key)" */
  ],
  "SymmetricKey": ["JSON", "Hex"],
  "UnsealingKey": ["JSON", "Hex (Unsealing Key)", "Hex (Sealing Key)"],
} as const;
type OutputFormats = typeof OutputFormats;
export type OutputFormat<T extends DerivationRecipeType = DerivationRecipeType> = OutputFormats[T][number]
export type OutputFormatForType<T extends DerivationRecipeType = DerivationRecipeType> = {[type in T]: OutputFormat<T>}
( () => {
  const TypeCheckOutputFormats: Record<DerivationRecipeType, readonly string[]> = OutputFormats;
  if (false) console.log(`${TypeCheckOutputFormats}`)
})
const DefaultOutputFormat: OutputFormatForType =  {
  "Password": "Password",
  "Secret": "JSON",
  "SigningKey": "JSON",
  "SymmetricKey": "JSON",
  "UnsealingKey": "JSON",
} as const
export const outputFormats = <T extends DerivationRecipeType>(type: T): OutputFormats[T]  => OutputFormats[type];

interface RecipeState {
  type?: DerivationRecipeType;
  recipeJson?: string;
  recipeIsValid: boolean;
}

export class DerivedFromRecipeState {
  readonly recipeState: RecipeState;
  readonly api: CachedApiCalls;
  SigningCalculations = new AsyncCalculation<string | undefined>();

  //////////////////////////////////////////
  // outputField to derive from recipe
  //////////////////////////////////////////  
  outputFieldForType: OutputFormatForType = {...DefaultOutputFormat};
  outputFieldFor = <T extends DerivationRecipeType>(t: T): OutputFormat<T> => this.outputFieldForType[t];
  setOutputField = action ( (value: OutputFormat<DerivationRecipeType>) => {
    const recipeType = this.recipeState.type;
    if (recipeType != null && (OutputFormats[recipeType] as readonly string[]).indexOf(value) != -1) {
      this.outputFieldForType[recipeType] = value;
    }
  });
  setOutputFieldTo = (value: OutputFormat<DerivationRecipeType>) => () => this.setOutputField(value);

  constructor({recipeState, seedString}: {recipeState: RecipeState, seedString: string} ) {
    this.recipeState = recipeState;
    this.api = new CachedApiCalls(seedString);

    makeAutoObservable(this);
  }

  get derivedSeedBytesHex(): string | undefined {
    const {recipeState, api} = this;
    const {type, recipeJson, recipeIsValid} = recipeState;
    if (type !== "Secret" || recipeIsValid !== true || recipeJson == null) return;
    return api.getSecretHexForRecipe(recipeJson);
  };

  get derivedValue(): string | undefined {
    const {recipeState, api} = this;
    const {type, recipeJson, recipeIsValid} = recipeState;
    if (!type || !isValidJson(recipeJson) || !recipeIsValid) return;
  
    switch (type) {
      case "Password":
        switch (this.outputFieldFor("Password")) {
          case "Password":
            return api.getPasswordForRecipe(recipeJson);
          case "JSON":
            return doubleSpaceJson(api.getPasswordJsonForRecipe(recipeJson))
        }
      case "Secret":
        switch (this.outputFieldFor("Secret")) {  // FIXME -- format JSON
          case "BIP39":
            return api.getSecretBip39ForRecipe(recipeJson);
          case "Hex":
            return api.getSecretHexForRecipe(recipeJson);
          case "JSON":
            return doubleSpaceJson(api.getSecretJsonForRecipe(recipeJson));
        }
      case "SymmetricKey":
        switch (this.outputFieldFor("SymmetricKey")) {
          case "Hex":
            return api.getSymmetricKeyHexForRecipe(recipeJson);
          case "JSON":
            return doubleSpaceJson(api.getSymmetricKeyJsonForRecipe(recipeJson));
        }
      case "UnsealingKey":
        switch (this.outputFieldFor("UnsealingKey")) {
          case "Hex (Unsealing Key)":
            return api.getUnsealingKeyHexForRecipe(recipeJson);
          case "Hex (Sealing Key)":
            return api.getSealingKeyHexForRecipe(recipeJson);
          case "JSON":
            return doubleSpaceJson(api.getUnsealingKeyJsonForRecipe(recipeJson));
        }
      case "SigningKey":
        switch (this.outputFieldFor("SigningKey")) {
          case "Hex (Signing Key)":
            return api.getSigningKeyHexForRecipe(recipeJson);
          case "OpenPGP Private Key": {
            const signingKeyJson = api.getSigningKeyJsonForRecipe(recipeJson);
            if (signingKeyJson == null) return undefined;
            return this.SigningCalculations.get(`${this.outputFieldFor("SigningKey")}:${recipeJson}}`, async () => {
              const signingKey = (await SeededCryptoModulePromise)?.SigningKey.fromJson(signingKeyJson);
              try {
                return signingKey.toOpenPgpPemFormatSecretKey("" /*user id*/, Math.floor(Date.now() / 1000));
              } finally {
                signingKey.delete();
              }                
            })
          }
          case "OpenSSH Private Key": {
            const signingKeyJson = api.getSigningKeyJsonForRecipe(recipeJson);
            if (signingKeyJson == null) return undefined;
            return this.SigningCalculations.get(`${this.outputFieldFor("SigningKey")}:${recipeJson}}`, async () => {
              const signingKey = (await SeededCryptoModulePromise)?.SigningKey.fromJson(signingKeyJson);
              try {
                return signingKey.toOpenSshPemPrivateKey("" /* comment */);
              } finally {
                signingKey.delete();
              }                
            })
          }
          case "OpenSSH Public Key": {
            const signingKeyJson = api.getSigningKeyJsonForRecipe(recipeJson);
            if (signingKeyJson == null) return undefined;
            return this.SigningCalculations.get(`${this.outputFieldFor("SigningKey")}:${recipeJson}}`, async () => {
              const signingKey = (await SeededCryptoModulePromise)?.SigningKey.fromJson(signingKeyJson);
              try {
                return signingKey.toOpenSshPublicKey();
              } finally {
                signingKey.delete();
              }                
            })
          }
          case "JSON":
            return doubleSpaceJson(api.getSigningKeyJsonForRecipe(recipeJson));
        }
    }
  };
}