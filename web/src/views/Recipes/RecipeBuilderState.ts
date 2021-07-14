import { action, makeAutoObservable } from "mobx";
import {
  StoredRecipe, DerivationRecipeType, builtInRecipeIdentifier, isRecipeBuiltIn, RecipeIdentifier, savedRecipeIdentifier, SavedRecipeIdentifier, BuiltInRecipeIdentifier, DiceKeysAppSecretRecipe, LoadedRecipe, LoadedRecipeOrigin
} from "../../dicekeys/StoredRecipe";
import {
  addHostsToRecipeJson,
  addLengthInBytesToRecipeJson,
  addLengthInCharsToRecipeJson,
  addPurposeToRecipeJson,
  addSequenceNumberToRecipeJson,
  getRecipeJson,
  hostsToPurpose,
//  isRecipeJsonConstructableFromFields,
  purposeToListOfHosts,
  RecipeFieldType,
  recipeJsonToAddableFields
} from "../../dicekeys/ConstructRecipe";
import { NumericTextFieldState } from "../basics/NumericTextFieldView";
import { Recipe } from "@dicekeys/dicekeys-api-js";
import { RecipeStore } from "../../state/stores/RecipeStore";
import { isValidJson } from "../../utilities/json";

// type EditingMode = "fields" | "json" | undefined;

// interface RecipeBuilderStateConstructorOptions {
//   type?: DerivationRecipeType;
//   purpose?: string;
//   editing?: boolean;
//   // fieldsToHide?: Set<RecipeFieldType>
//   // fieldsToMakeNonEditableByDefault?: Set<RecipeFieldType>
// }


export class RecipeFieldFocusState {
  constructor(
    private state: {fieldInFocus?: RecipeFieldType, setFieldInFocus: (field?: RecipeFieldType) => void},
    private field: RecipeFieldType
  ) {}

  get isFieldInFocus(): boolean { return this.field === this.state.fieldInFocus};
  focus = () => this.state.setFieldInFocus(this.field);
  toggleFocus = () => this.state.setFieldInFocus(this.isFieldInFocus ? undefined : this.field);
};


/**
 * State for building and displaying recipes
 */
export class RecipeBuilderState {
//  fieldsToHide?: Set<RecipeFieldType>;
  fieldsToMakeNonEditableByDefault?: Set<RecipeFieldType>;
  constructor(loadedRecipe?: LoadedRecipe) {
    makeAutoObservable(this);
    if (loadedRecipe != null) {
      this.loadRecipe(loadedRecipe);
    }
//    this.fieldsToHide = fieldsToHide;
//    this.fieldsToMakeNonEditableByDefault = fieldsToMakeNonEditableByDefault;
    // this.type = type;
    // this.purposeField = purpose;
    // this.editing = editing;
//    this.purposeFieldNonEditableByDefault = purposeFieldNonEditableByDefault;
//    this._mayEditPurpose = this.origin != "BuiltIn"; // !fieldsToMakeNonEditableByDefault?.has("purpose");
    // if (purpose) {
    //   this.setRecipeJson(addPurposeToRecipeJson(undefined, purpose));
    // }
  }

  origin: LoadedRecipeOrigin | undefined;
  setOrigin = action( (origin: LoadedRecipeOrigin | undefined) => {
    this.origin = origin;
  } )

  type: DerivationRecipeType | undefined;
  setType = action( (type: DerivationRecipeType | undefined) => {
    this.type = type;
  } )

  //
  editing: boolean = false;
  allowEditingOfRawRecipe: boolean = false;

  setStartEditing = action( () => {
    this.editing = true;
    this.setFieldInFocus("purpose");
  })
  stopEditing = action( () => {
    this.editing = false;
  });

  setAllowEditingOfRawRecipe = action ( (editingRawRecipe: boolean) => {
    this.allowEditingOfRawRecipe = editingRawRecipe;
  });
  toggleAllowEditingOfRawRecipe = () => this.setAllowEditingOfRawRecipe(!this.allowEditingOfRawRecipe);

  //////////////////////////////////////////
  // helpToDisplay while building a recipe
  //////////////////////////////////////////
  /**
   * The field to provide help for, or undefined to show help about the
   * type of secret being created
   */
	fieldInFocus?: RecipeFieldType = "purpose";
  setFieldInFocus = action ( (field?: RecipeFieldType) => {
		this.fieldInFocus = field;
	});

  /////////////////////////////////
  // SequenceNumber field ("#")
  /////////////////////////////////
  sequenceNumberState = new NumericTextFieldState({minValue: 2, onChanged: (sequenceNumber) => {
    this.recipeJson = addSequenceNumberToRecipeJson(this.recipeJson, sequenceNumber);
  }});
  get sequenceNumber(): number | undefined { return this.sequenceNumberState.numericValue } 

  /////////////////////////////////////////////////////////////
  // LengthInChars field ("lengthInChars") for Passwords only
  /////////////////////////////////////////////////////////////
  public get lengthInCharsFieldNonEditableByDefault(): boolean {
    return !!this.fieldsToMakeNonEditableByDefault?.has("lengthInChars");
  }
  public get lengthInCharsFieldHide(): boolean {
    return this.origin !== "Template";
  }
  get mayEditLengthInChars(): boolean { return this.type === "Password" }
  lengthInCharsState = new NumericTextFieldState({minValue: 16, incrementBy: 4, defaultValue: 64, onChanged: (lengthInChars) => {
    this.recipeJson = addLengthInCharsToRecipeJson(this.recipeJson, lengthInChars);
  }});
  get lengthInChars(): number | undefined { return this.lengthInCharsState.numericValue }

  ///////////////////////////////////////////////////////////
  // LengthInBytes field ("lengthInBytes") for Secrets only
  ///////////////////////////////////////////////////////////
  public get lengthInBytesFieldNonEditableByDefault(): boolean {
    return !!this.fieldsToMakeNonEditableByDefault?.has("lengthInBytes");
  }
  public get lengthInBytesFieldHide(): boolean {
    return this.origin !== "Template";
  }
  get mayEditLengthInBytes(): boolean { return this.type === "Secret" }
  lengthInBytesState = new NumericTextFieldState({minValue: 4, incrementBy: 16, defaultValue: 32, onChanged: (lengthInBytes) => {
    this.recipeJson = addLengthInBytesToRecipeJson(this.recipeJson, lengthInBytes);
  }});
  get lengthInBytes(): number | undefined { return this.lengthInBytesState.numericValue }

  ////////////////////////////////////
  // Name field ("name") to be saved
  ////////////////////////////////////
  get prescribedName(): string | undefined {
    return this.purpose?.substr(0, 20) ?? this.hosts?.join(", ");
  }

  public name: string = "";
  setName = action ( (name: string) => this.name = name );

  //////////////////////////////////////////
  // Purpose field ("purpose" or "allow")
  //////////////////////////////////////////
  public get purposeFieldNonEditableByDefault(): boolean {
    return !!this.fieldsToMakeNonEditableByDefault?.has("purpose");
  }
  public get purposeFieldHide(): boolean {
    return this.origin !== "Template";
  }
  private _mayEditPurpose: boolean = true;
  get mayEditPurpose(): boolean { return this._mayEditPurpose };
  setMayEditPurpose = action ( (mayEditPurpose: boolean) => this._mayEditPurpose = mayEditPurpose);
  purposeField: string = "";
  /** The purpose of the recipe from the purpose form field if not a list of 1 or more hosts */
  get purpose(): string | undefined { return this.hosts != null || this.purposeField.length === 0 ? undefined : this.purposeField; }
  setPurposeField = action ( (newPurposeFieldValue: string) => {
    this.purposeField = newPurposeFieldValue;
    const {hosts, purpose} = this;
    this.recipeJson = addHostsToRecipeJson(this.recipeJson, hosts);
    this.recipeJson = addPurposeToRecipeJson(this.recipeJson, purpose);
  });

  /**
   * The hosts for the "allow" restrictions of a recipe if the purpose field contains
   * a URL or list of hosts
   */
  get hosts(): string[] | undefined { return purposeToListOfHosts(this.purposeField); }
  get purposeContainsHosts(): boolean { return (this.hosts?.length ?? 0) > 0 }

  ///////////////////////////////////////////////
  // Deriving a recipe from all the form fields
  ///////////////////////////////////////////////
  /**
   * The JSON of the recipe after all user adjustment have been applied
   */
  setRecipeJson = action ( (recipeJson: string | undefined) => {
    if (recipeJson != null) {
      this.setFieldsFromRecipeJson(recipeJson);
    } else {
      this.emptyAllRecipeFields();
    }
    this.recipeJson = recipeJson;
  });
  get prescribedRecipeJson(): string | undefined {
    return getRecipeJson(this);
  }

  recipeJson: string | undefined;

  get recipe(): DiceKeysAppSecretRecipe | undefined {
    const {type, recipeJson} = this;
    if (!type || !isValidJson(recipeJson)) return;
    return JSON.parse(recipeJson) as DiceKeysAppSecretRecipe;
  }

  get recipeIsValid(): boolean {
    const {recipe} = this;
    return recipe != null && (
      (recipe.purpose != null && recipe.purpose.length > 0) ||
      (recipe.allow != null && recipe.allow.length > 0)
    );
  }

  get savedRecipeIdentifer(): SavedRecipeIdentifier | undefined {
    const {type, name, recipeJson} = this;
    if (type == null || name == null || recipeJson == null) return;
    const storedRecipe: StoredRecipe = {type, name, recipeJson};
    if (RecipeStore.isRecipeSaved(storedRecipe)) {
      return savedRecipeIdentifier(storedRecipe);
    }
    return;
  }

  get builtInRecipeIdentifer(): BuiltInRecipeIdentifier | undefined {
    const {type, name, recipeJson} = this;
    if (type == null || name == null || recipeJson == null) return;
    const storedRecipe: StoredRecipe = {type, name, recipeJson};
    if (isRecipeBuiltIn(storedRecipe)) {
      return builtInRecipeIdentifier(storedRecipe);
    }
    return;
  }

  get recipeIdentifier(): RecipeIdentifier | undefined {
    return this.savedRecipeIdentifer || this.builtInRecipeIdentifer;
  }

  get areAllRecipeFieldsEmpty(): boolean {
    return this.name == "" &&
      this.purposeField == "" &&
      this.sequenceNumber == null &&
      this.lengthInBytes == null &&
      this.lengthInChars == null
  }

  emptyAllRecipeFields = action (() => {
    this.name = "";
    this.purposeField = "";
    this.sequenceNumberState.textValue = ""
    this.lengthInBytesState.textValue = "";
    this.lengthInCharsState.textValue = ""
  })

  setFieldsFromRecipeJson = action ( (recipeJson: string) => {
    try {
      const {type} = JSON.parse(recipeJson) as Recipe;
      if (type != null) {
        this.type = type;
      }
    } catch {}
    const {purpose, hosts, sequenceNumber, lengthInBytes, lengthInChars} = recipeJsonToAddableFields(recipeJson);
    if (purpose != null) {
      this.purposeField = purpose;
    } else if (hosts != null) {
      this.purposeField = hostsToPurpose(hosts);
    }
    this.sequenceNumberState.textValue = sequenceNumber != null ? `${sequenceNumber}` : ""
    this.lengthInBytesState.textValue = lengthInBytes != null ? `${lengthInBytes}` : "";
    this.lengthInCharsState.textValue = lengthInChars != null ? `${lengthInChars}` : ""
  });

  loadRecipe = action ((loadedRecipe?: LoadedRecipe) => {
    if (loadedRecipe == null) return;
    this.emptyAllRecipeFields();
    this.origin = loadedRecipe.origin;
    this.name = loadedRecipe.name ?? "";
    this.type = loadedRecipe.type;
    // if (
    //   loadedRecipe.type === "Password" && loadedRecipe.recipeJson != null &&
    //   ((JSON.parse(loadedRecipe.recipeJson) as DiceKeysAppSecretRecipe).purpose?.length ?? 0) > 0) {
    //   // This is a 
    //   this.fieldsToHide = new Set<RecipeFieldType>(["purpose", "lengthInChars"])
    // }
    // Edit if custom recipe
    this.editing = origin !== "Saved";
    this.allowEditingOfRawRecipe = false;
    this.setRecipeJson(loadedRecipe.recipeJson);
  });
}
