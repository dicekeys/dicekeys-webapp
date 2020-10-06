import layoutStyles from "./layout.module.css";
import {
  Component,
  ComponentEvent,
  InputButton
} from "../web-component-framework"

export class DisplayWhenNoDiceKeyPresent extends Component {
  
  public readonly loadDiceKeyButtonClicked = new ComponentEvent<[MouseEvent]>(this);
  public readonly typeDiceKeyButtonClicked = new ComponentEvent<[MouseEvent]>(this);
  public readonly createRandomDiceKeyButtonClicked = new ComponentEvent<[MouseEvent]>(this);

  /**
   * The code supporting the demo page cannot until the WebAssembly module for the image
   * processor has been loaded. Pass the module to wire up the page with this class.
   * @param module The web assembly module that implements the DiceKey image processing.
   */
  constructor(
    options: {} = {},
  ) {
    super(options);
  }

  render() {
    super.render();
    this.addClass(layoutStyles.centered_column);
    this.append(
      InputButton({
        value: "Scan your DiceKey",
        events: (events) => {
          events.click.on( this.loadDiceKeyButtonClicked.send )
        }}),
      InputButton({
        value: "Type your DiceKey",
        style: "margin-top: 10vh;",
        events: (events) => {
          events.click.on( this.typeDiceKeyButtonClicked.send )
        }}),
      InputButton({
        value: "Create a Random DiceKey for Testing",
        style: "margin-top: 10vh;",
        events: (events) => {
          events.click.on( this.createRandomDiceKeyButtonClicked.send )
      }}),
      
    );
  }

}
