/**
 * A TextBuilder that can be used to build up a large string.
 */
export class TextBuilder {
  private text: string;

  constructor(text?: string) {
    this.text = text || "";
  }

  /**
   * Append the provided value to this TextBuilder's text.
   * @param value The value to append.
   */
  public append(value: BuilderActions<TextBuilder>): TextBuilder {
    this.text += value;
    return this;
  }

  public appendLine(value?: BuilderActions<TextBuilder>): TextBuilder {
    if (value) {
      this.append(value);
    }
    return this.append("\n");
  }

  /**
   * Get the text that this TextBuilder has been building.
   */
  public toString(): string {
    return this.text;
  }
}

export type BuilderActions<T> = string | ((builder: T) => void) | (undefined | string | ((builder: T) => void))[];

export interface TextElementBuilder {
  /**
   * Start the element.
   */
  start(): void;

  /**
   * Add the provided content to this element.
   * @param actions The content to add to the element.
   */
  content(actions: BuilderActions<TextElementBuilder>): TextElementBuilder;

  /**
   * End the html element.
   */
  end(): void;

  /**
   * Get the text that this TextElementBuilder has been building.
   */
  toString(): string;
}

/**
 * Create an element using the provided builder and actions.
 * @param builder The builder to create.
 * @param actions The actions to use to create the builder's element.
 */
export function create<T extends TextElementBuilder>(builder: T, actions?: BuilderActions<T>): string {
  builder.start();
  if (actions) {
    if (typeof actions === "string" || typeof actions === "function") {
      actions = [actions];
    }
    for (const action of actions) {
      if (action) {
        if (typeof action === "string") {
          builder.content(action);
        } else if (typeof action === "function") {
          action(builder);
        }
      }
    }
  }
  builder.end();
  return builder.toString();
}

export function repeatText(text: string, count: number): string {
  let result = "";
  for (let i = 0; i < count; ++i) {
    result += text;
  }
  return result;
}
