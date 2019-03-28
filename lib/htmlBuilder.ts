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
  public append(value: string): TextBuilder {
    this.text += value;
    return this;
  }

  /**
   * Get the text that this TextBuilder has been building.
   */
  public toString(): string {
    return this.text;
  }
}

/**
 * Create an html element string.
 */
export function html(htmlActions?: string | ((htmlBuilder: HTMLBuilder) => void) | (string | ((htmlBuilder: HTMLBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new HTMLBuilder(textBuilder).create(htmlActions);
}

/**
 * Create a body element string.
 */
export function body(bodyActions?: string | ((bodyBuilder: BodyBuilder) => void) | (string | ((bodyBuilder: BodyBuilder) => void)), textBuilder: TextBuilder = new TextBuilder()): string {
  return new BodyBuilder(textBuilder).create(bodyActions);
}

/**
 * Create a h element string.
 */
export function h(level: number, hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new HBuilder(level, textBuilder).create(hActions);
}

/**
 * Create a h1 element string.
 */
export function h1(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return h(1, hActions, textBuilder);
}

/**
 * Create a h2 element string.
 */
export function h2(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return h(2, hActions, textBuilder);
}

/**
 * Create a h3 element string.
 */
export function h3(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return h(3, hActions, textBuilder);
}

/**
 * Create a h4 element string.
 */
export function h4(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return h(4, hActions, textBuilder);
}

/**
 * Create a table element string.
 */
export function table(tableActions?: string | ((tableBuilder: TableBuilder) => void) | (string | ((tableBuilder: TableBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new TableBuilder(textBuilder).create(tableActions);
}

/**
 * Create a tr element string.
 */
export function tr(trActions?: string | ((trBuilder: TRBuilder) => void) | (string | ((trBuilder: TRBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new TRBuilder(textBuilder).create(trActions);
}

/**
 * Create a td element string.
 */
export function td(tdActions?: string | ((tdBuilder: TDBuilder) => void) | (string | ((tdBuilder: TDBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new TDBuilder(textBuilder).create(tdActions);
}

/**
 * Create a a element string.
 */
export function a(aActions?: string | ((aBuilder: ABuilder) => void) | (string | ((aBuilder: ABuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new ABuilder(textBuilder).create(aActions);
}

/**
 * Create a img element string.
 */
export function img(imgActions?: string | ((imgBuilder: ImgBuilder) => void) | (string | ((imgBuilder: ImgBuilder) => void))[], textBuilder: TextBuilder = new TextBuilder()): string {
  return new ImgBuilder(textBuilder).create(imgActions);
}

/**
 * A class that can be used to create a generic HTML element.
 */
export class ElementBuilder {
  private hasContent: boolean;

  /**
   * Create a new HTMLBuilder.
   */
  constructor(private readonly elementName: string, protected readonly text: TextBuilder = new TextBuilder()) {
    this.hasContent = false;
  }

  /**
   * Start the html element.
   */
  public start(): void {
    this.text.append(`<${this.elementName}`);
  }

  /**
   * Add the provided attribute to the html element.
   * @param attributeName The name of the attribute.
   * @param attributeValue The value of the attribute.
   */
  public attribute(attributeName: string, attributeValue: string | number): ElementBuilder {
    this.text.append(` ${attributeName}="${attributeValue.toString()}"`);
    return this;
  }

  /**
   * Add the provided content to this element. This will close the start tag of the element if it
   * was open.
   * @param contentActions The content to add to the element.
   */
  public content(contentActions: string | ((element: ElementBuilder) => void) | (string | ((element: ElementBuilder) => void))[]): ElementBuilder {
    if (typeof contentActions === "string" || typeof contentActions === "function") {
      contentActions = [contentActions];
    }
    for (const contentAction of contentActions) {
      if (contentAction) {
        if (!this.hasContent) {
          this.text.append(">");
          this.hasContent = true;
        }

        if (typeof contentAction === "string") {
          this.text.append(contentAction);
        } else {
          contentAction(this);
        }
      }
    }
    return this;
  }

  /**
   * End the html element.
   */
  public end(): void {
    if (!this.hasContent) {
      this.text.append("/>");
    } else {
      this.text.append(`</${this.elementName}>`);
    }
  }

  /**
   * Get the HTML text that this HTMLBuilder has been building.
   */
  public toString(): string {
    return this.text.toString();
  }
}

/**
 * Create an element using the provided builder and actions.
 * @param builder The builder to create.
 * @param actions The actions to use to create the builder's element.
 */
function create<T extends ElementBuilder>(builder: T, actions?: string | ((builder: T) => void) | (string | ((builder: T) => void))[]): string {
  builder.start();
  if (actions) {
    if (typeof actions === "string" || typeof actions === "function") {
      actions = [actions];
    }
    for (const action of actions) {
      if (typeof action === "string") {
        builder.content(action);
      } else if (typeof action === "function") {
        action(builder);
      }
    }
  }
  builder.end();
  return builder.toString();
}

/**
 * A class that can be used to build an html element.
 */
export class HTMLBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("html", text);
  }

  /**
   * Populate this element using the provided action.
   * @param htmlActions The actions that will populate this element.
   */
  public create(htmlActions?: string | ((htmlBuilder: HTMLBuilder) => void) | (string | ((htmlBuilder: HTMLBuilder) => void))[]): string {
    return create(this, htmlActions);
  }

  /**
   * Add a body element to this html element's content.
   * @param bodyAction The action that will create the body element.
   */
  public body(bodyAction?: (body: BodyBuilder) => void): HTMLBuilder {
    this.content(() => body(bodyAction, this.text));
    return this;
  }
}

/**
 * A class that can be used to build a body element.
 */
export class BodyBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("body", text);
  }

  /**
   * Populate this element using the provided action.
   * @param bodyActions The actions that will populate this element.
   */
  public create(bodyActions?: string | ((bodyBuilder: BodyBuilder) => void) | (string | ((bodyBuilder: BodyBuilder) => void))[]): string {
    return create(this, bodyActions);
  }

  /**
   * Add a table element to this body element's content.
   * @param tableAction The action that will create the table element.
   */
  public table(tableActions?: (string | ((tableBuilder: TableBuilder) => void))[]): BodyBuilder {
    this.content(() => table(tableActions, this.text));
    return this;
  }
}

/**
 * A class that can be used to build an h element.
 */
export class HBuilder extends ElementBuilder {
  constructor(level: number, text?: TextBuilder) {
    super(`h${level}`, text);
  }

  /**
   * Populate this element using the provided action.
   * @param hActions The actions that will populate this element.
   */
  public create(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): string {
    return create(this, hActions);
  }

  /**
   * Add an a element to this h element's content.
   * @param aAction The action that will create the tr element.
   */
  public a(aAction?: (aBuilder: ABuilder) => void): HBuilder {
    this.content(() => a(aAction, this.text));
    return this;
  }
}

/**
 * A class that can be used to build a table element.
 */
export class TableBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("table", text);
  }

  /**
   * Populate this element using the provided action.
   * @param tableActions The actions that will populate this element.
   */
  public create(tableActions?: string | ((tableBuilder: TableBuilder) => void) | (string | ((tableBuilder: TableBuilder) => void))[]): string {
    return create(this, tableActions);
  }

  /**
   * Add a tr element to this table element's content.
   * @param trAction The action that will create the tr element.
   */
  public tr(trAction?: (trBuilder: TRBuilder) => void): TableBuilder {
    this.content(() => tr(trAction, this.text));
    return this;
  }
}

/**
 * A class that can be used to build a tr element.
 */
export class TRBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("tr", text);
  }

  /**
   * Populate this element using the provided action.
   * @param trActions The actions that will populate this element.
   */
  public create(trActions?: string | ((trBuilder: TRBuilder) => void) | (string | ((trBuilder: TRBuilder) => void))[]): string {
    return create(this, trActions);
  }

  /**
   * Add a td element to this tr element's content.
   * @param tdAction The action that will create the td element.
   */
  public td(tdAction?: (tdBuilder: TDBuilder) => void): TRBuilder {
    this.content(() => td(tdAction, this.text));
    return this;
  }
}

/**
 * A class that can be used to build a td element.
 */
export class TDBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("td", text);
  }

  /**
   * Populate this element using the provided action.
   * @param tdActions The actions that will populate this element.
   */
  public create(tdActions?: string | ((tdBuilder: TDBuilder) => void) | (string | ((tdBuilder: TDBuilder) => void))[]): string {
    return create(this, tdActions);
  }

  /**
   * Add a colspan attribute to this td element.
   * @param value The value of the colspan attribute.
   */
  public colspan(value: number): TDBuilder {
    this.attribute("colspan", value);
    return this;
  }

  /**
   * Add a rowspan attribute to this td element.
   * @param value The value of the rowspan attribute.
   */
  public rowspan(value: string | number): TDBuilder {
    this.attribute("rowspan", value);
    return this;
  }

  /**
   * Create an a element in this td element.
   * @param aActions The actions to use to populate the a element.
   */
  public a(aActions?: string | ((aBuilder: ABuilder) => void) | (string | ((aBuilder: ABuilder) => void))[]): TDBuilder {
    this.content(a(aActions));
    return this;
  }

  /**
   * Create a header element in this td element.
   * @param level The level of the header.
   * @param hActions The actions to use to populate the header element.
   */
  public h(level: number, hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): TDBuilder {
    this.content(h(level, hActions));
    return this;
  }

  /**
   * Create a h1 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h1(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): TDBuilder {
    this.content(h1(hActions));
    return this;
  }

  /**
   * Create a h2 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h2(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): TDBuilder {
    this.content(h2(hActions));
    return this;
  }

  /**
   * Create a h3 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h3(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): TDBuilder {
    this.content(h3(hActions));
    return this;
  }

  /**
   * Create a h4 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h4(hActions?: string | ((hBuilder: HBuilder) => void) | (string | ((hBuilder: HBuilder) => void))[]): TDBuilder {
    this.content(h4(hActions));
    return this;
  }
}

/**
 * A class that can be used to build an a element.
 */
export class ABuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("a", text);
  }

  /**
   * Populate this element using the provided action.
   * @param aActions The actions that will populate this element.
   */
  public create(aActions?: string | ((aBuilder: ABuilder) => void) | (string | ((aBuilder: ABuilder) => void))[]): string {
    return create(this, aActions);
  }

  /**
   * Add an href attribute to this a element.
   * @param hrefValue The value of the href attribute.
   */
  public href(hrefValue: string): ABuilder {
    this.attribute("href", hrefValue);
    return this;
  }
}

/**
 * A class that can be used to build an img element.
 */
export class ImgBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("img", text);
  }

  /**
   * Populate this element using the provided action.
   * @param imgActions The actions that will populate this element.
   */
  public create(imgActions?: string | ((imgBuilder: ImgBuilder) => void) | (string | ((imgBuilder: ImgBuilder) => void))[]): string {
    return create(this, imgActions);
  }

  /**
   * Add a src attribute to this img element.
   * @param srcValue The value of the src attribute.
   */
  public src(srcValue: string): ImgBuilder {
    this.attribute("src", srcValue);
    return this;
  }

  /**
   * Add an alt attribute to this img element.
   * @param altValue The value of the alt attribute.
   */
  public alt(altValue: string): ImgBuilder {
    this.attribute("alt", altValue);
    return this;
  }

  /**
   * Add an width attribute to this img element.
   * @param widthValue The value of the width attribute.
   */
  public width(widthValue: number): ImgBuilder {
    this.attribute("width", widthValue);
    return this;
  }

  /**
   * Add an height attribute to this img element.
   * @param heightValue The value of the height attribute.
   */
  public height(heightValue: number): ImgBuilder {
    this.attribute("height", heightValue);
    return this;
  }
}
