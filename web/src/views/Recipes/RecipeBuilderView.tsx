import css from "./Recipes.module.css";
import React from "react";
import { observer  } from "mobx-react";
import { RecipeFieldFocusState, RecipeBuilderState } from "./RecipeBuilderState";
import { NumberPlusMinusView } from "../../views/basics/NumericTextFieldView";
import { RecipeDescriptionView } from "./RecipeDescriptionView";
import { EnhancedRecipeView } from "./EnhancedRecipeView";
import { describeRecipeType } from "./DescribeRecipeType";
import { SelectAndSaveTableHeaderView } from "./SelectAndSaveTableHeaderView";
import { getRegisteredDomain } from "../../domains/get-registered-domain";
import { useContainerDimensions } from "../../utilities/react-hooks/useContainerDimensions";
import { CharButton } from "../../views/basics";

// TO DO

// Warning if json does not match fields alone

// LATER?

// Make json parser more resilient to errors?
// Add/remove field for other optional fields?

export const RecipeFieldDescription = (props: React.PropsWithChildren<{}>) => (
  <div className={css.FieldToolTip}>{props.children}</div>
)

export const RecipeFieldView = observer ( ({
  label, for: htmlFor, children, focusState, mayEdit, toggleEdit
}: React.PropsWithChildren<
  {
  focusState: RecipeFieldFocusState
  label: JSX.Element | string,
  for?: string,
  mayEdit?: boolean,
  toggleEdit?: () => void,
}>) => (
  <div
    className={focusState.isFieldInFocus ? css.RecipeFieldSelected : css.RecipeField}
    // onMouseEnter={ focus }
  >
    {children}
    <div className={css.RecipeFieldLabelRow}>
      {/* <div>&nbsp;</div> */}
      <label htmlFor={htmlFor}
        className={css.FieldLabel}
        onClick={ focusState.toggleFocus }
      >{ label }{ focusState.toggleFocus == null ? null : (<>&nbsp;&nbsp;&#9432;</>)}
      </label>
      { mayEdit == null || toggleEdit == null ? (null) : (
      <div className={css.FieldEditButton}>
        <CharButton onClick={toggleEdit}><span style={mayEdit ? {} : {textDecorationLine: "line-through"}}>&#9998;</span></CharButton>
      </div> 
      ) }
    </div>
  </div>
));

export const PurposeFieldView = observer( ({state}: {
  state: RecipeBuilderState,
} ) => {
  const field = "purpose"
  if (state.purposeFieldHide) return null;
  const fieldFocusState = new RecipeFieldFocusState(state, field);
  return (
    <RecipeFieldView
      focusState={fieldFocusState}
      label="purpose (required)"
      for={field}
      mayEdit={state.mayEditPurpose}
      toggleEdit={!state.purposeFieldNonEditableByDefault ? undefined : () => {
        state.setMayEditPurpose(!state.mayEditPurpose)
      }}
    >
      <input id={field} type="text" spellCheck={false}
        className={css.PurposeOrHostNameTextField}
        disabled={!state.mayEditPurpose}
        size={40}
        value={state.purposeField ?? ""}
        placeholder=""
        ref={ e => { if (e != null) { e?.focus(); fieldFocusState.focus() } } }
        onPaste={ e => {
          // If pasting a URL, paste only the domain
          const text = e.clipboardData.getData("text")
          if (text.startsWith("http://") || text.startsWith("https://")) {
            const domain = getRegisteredDomain(text);
            if (domain != null) {
              state.setPurposeField(domain);
              e.preventDefault();
            }
          }
        }}
        onInput={ e => {state.setPurposeField(e.currentTarget.value); fieldFocusState.focus(); }} 
        onFocus={ fieldFocusState.focus } />
    </RecipeFieldView>
  );
});

export const SequenceNumberFormFieldView = observer( ({state}: {state: RecipeBuilderState}) => {
  const fieldFocusState = new RecipeFieldFocusState(state, "#");
  return (
    <RecipeFieldView focusState={fieldFocusState}
    label={"sequence #"} >
      <NumberPlusMinusView 
        textFieldClassName={css.SequenceNumberTextField}
        state={state.sequenceNumberState}
        placeholder={"1"}
        onFocusedOrChanged={fieldFocusState.focus} />
    </RecipeFieldView>
  )});

  export const LengthInCharsFormFieldView = observer( ({state}: {state: RecipeBuilderState}) => {
    if (state.type !== "Password" || state.lengthInCharsFieldHide || !state.mayEditLengthInChars) return null;
    const fieldFocusState = new RecipeFieldFocusState(state, "lengthInChars");
    return (
      <RecipeFieldView focusState={fieldFocusState} label={"max length"} >
        <NumberPlusMinusView
          textFieldClassName={css.LengthTextField}
          state={state.lengthInCharsState}
          placeholder={"none"}
          onFocusedOrChanged={fieldFocusState.focus} />
      </RecipeFieldView>
    );
  });

export const LengthInBytesFormFieldView = observer( ({state}: {state: RecipeBuilderState}) => {
  if (state.type !== "Secret" || state.lengthInBytesFieldHide || !state.mayEditLengthInBytes) return null;
  const fieldFocusState = new RecipeFieldFocusState(state, "lengthInBytes");
  return (
    <RecipeFieldView focusState={fieldFocusState} label={"length (bytes)"} >
      <NumberPlusMinusView
        textFieldClassName={css.LengthTextField}
        state={state.lengthInBytesState}
        placeholder={"32"}
        onFocusedOrChanged={fieldFocusState.focus} />
    </RecipeFieldView>
  );
});

const RecipeFieldsHelpContentView = observer ( ( {state}: {state: RecipeBuilderState}) => {
  const secretType = state.type === "Password" ? "password" :
    state.type === "Secret" ? "secret" :
    "password, secret, or key"
  switch(state.fieldInFocus) {
    case "#": return (
      <>If you need more than one {secretType} for this purpose, add a sequence number.</>);
    case "purpose": return (<>
        If this {secretType} is for a website, paste its web address (URL) into the purpose field.<br/>
        Be careful not to create your own purpose and forget it, as you cannot
        re-create the {secretType} without it.
      </>);
    case "lengthInChars": return (<>
      Limit the length of the generated password to a maximum number of characters.
    </>);
    case "lengthInBytes": return (<>
      Set the number of bytes to generate for the {secretType}.
    </>);
    case "rawJson": return (<>
      The recipe's internal JSON format.
      <br/>
      <b>Be careful.</b>&nbsp;
      Do not edit it manually unless absolutely necessary.
      Changing even one character will change the {secretType}.
      If you can't re-create the exact recipe string used to generate a {secretType},
      you will be unable to regenerate it.
    </>);
    default: return state.type == null ? (<>
      Choose a recipe or template above.
    </>) : (<>
      The fields below change the recipe used to derive the {describeRecipeType(state.type).toLocaleLowerCase()}.
    </>);
  }
});

export const RecipeFieldsHelpView = observer ( ( {state}: {state: RecipeBuilderState}) => (
  <div className={css.RecipeHelpBlock}>
    <div className={css.RecipeHelpContent}>
      <div style={{display: "block"}}>
        <RecipeFieldsHelpContentView state={state} />
      </div>
    </div>
  </div>
));

export const RecipeBuilderFieldsView = observer( ( {state}: {state: RecipeBuilderState}) => {
  return (
    <div className={css.RecipeFields}>
      <PurposeFieldView state={state} />
      <LengthInCharsFormFieldView state={state} />
      <LengthInBytesFormFieldView state={state} />
      <SequenceNumberFormFieldView state={state} />
    </div>
  );
});

export const JsonFieldView = observer( ({state}: {
  state: RecipeBuilderState,
} ) => {
  const textAreaComponentRef = React.useRef<HTMLTextAreaElement>(null);
  const divAreaComponentRef = React.useRef<HTMLDivElement>(null);
  const editable = state.editing && state.allowEditingOfRawRecipe;
  const { width } = useContainerDimensions(editable ? textAreaComponentRef : divAreaComponentRef)


  const fieldFocusState = new RecipeFieldFocusState(state, "rawJson");
  return (
    <RecipeFieldView
      focusState={fieldFocusState}
      toggleEdit={ state.toggleAllowEditingOfRawRecipe }
      mayEdit={ state.allowEditingOfRawRecipe }
      label="recipe in JSON format">
      <div className={css.FormattedRecipeBox}>
        <div className={css.FormattedRecipeUnderlay} style={{width: `${width ?? 0}px`}} >
          <EnhancedRecipeView recipeJson={state.recipeJson} />
        </div>
        { editable ? (
          <textarea spellCheck={false}
          ref={textAreaComponentRef}
          disabled={!state.editing}
          className={css.FormattedRecipeTextField}
          value={state.recipeJson ?? ""}
          style={{...(state.editing ? {} : {userSelect: "all"})}}
          onFocus={fieldFocusState.focus}
          onInput={ e => {state.setRecipeJson(e.currentTarget.value); fieldFocusState.focus(); }} 
          />
        ) : (
          <div
            ref={divAreaComponentRef}
            className={css.FormattedRecipeDisabledDiv}
            style={{userSelect: "all"}}
          >{state.recipeJson ?? (<>&nbsp;</>)}</div>   
        ) }
      </div>
    </RecipeFieldView>
  );
});

export const RecipeRawJsonView = observer( ( {state}: {state: RecipeBuilderState}) => {
  return (
    <div className={css.RecipeSingleFieldRow}>
      <JsonFieldView state={state} />
    </div>
  );
});


export const RecipeBuilderView = observer( ( {state}: {state: RecipeBuilderState, hideHeader?: boolean}) => {
  if (state.type == null) return (<></>);
  return (
    <div className={css.RecipeBuilderBlock}>
      <SelectAndSaveTableHeaderView {...{state}} />
      <div className={css.RecipeFormFrame}>
        { !state.editing ? (<></>) : (
          <>
          <RecipeFieldsHelpView {...{state}} />
          <RecipeBuilderFieldsView state={state} />
          </>
        )}
        <RecipeRawJsonView state={state} /> 
      </div>
      <div className={css.RecipeAndExplanationBlock} >
        <RecipeDescriptionView state={state} /> 
      </div>
    </div>
  );
});
