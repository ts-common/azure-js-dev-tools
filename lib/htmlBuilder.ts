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
export function html(htmlAction?: string | ((htmlBuilder: HTMLBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new HTMLBuilder(textBuilder).create(htmlAction);
}

/**
 * Create a body element string.
 */
export function body(bodyAction?: string | ((bodyBuilder: BodyBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new BodyBuilder(textBuilder).create(bodyAction);
}

/**
 * Create a h element string.
 */
export function h(level: number, hAction?: string | ((hBuilder: HBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new HBuilder(level, textBuilder).create(hAction);
}

/**
 * Create a h1 element string.
 */
export function h1(hAction?: string | ((hBuilder: HBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return h(1, hAction, textBuilder);
}

/**
 * Create a h2 element string.
 */
export function h2(hAction?: string | ((hBuilder: HBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return h(2, hAction, textBuilder);
}

/**
 * Create a h3 element string.
 */
export function h3(hAction?: string | ((hBuilder: HBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return h(3, hAction, textBuilder);
}

/**
 * Create a h4 element string.
 */
export function h4(hAction?: string | ((hBuilder: HBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return h(4, hAction, textBuilder);
}

/**
 * Create a table element string.
 */
export function table(tableAction?: string | ((tableBuilder: TableBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new TableBuilder(textBuilder).create(tableAction);
}

/**
 * Create a tr element string.
 */
export function tr(trAction?: string | ((trBuilder: TRBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new TRBuilder(textBuilder).create(trAction);
}

/**
 * Create a td element string.
 */
export function td(tdAction?: string | ((tdBuilder: TDBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new TDBuilder(textBuilder).create(tdAction);
}

/**
 * Create a a element string.
 */
export function a(aAction?: string | ((aBuilder: ABuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new ABuilder(textBuilder).create(aAction);
}

/**
 * Create a img element string.
 */
export function img(imgAction?: string | ((imgBuilder: ImgBuilder) => void), textBuilder: TextBuilder = new TextBuilder()): string {
  return new ImgBuilder(textBuilder).create(imgAction);
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
   * @param content The content to add to the element.
   */
  public content(content: string | (() => unknown)): ElementBuilder {
    if (content) {
      if (!this.hasContent) {
        this.text.append(">");
        this.hasContent = true;
      }
      if (typeof content === "string") {
        this.text.append(content);
      } else {
        content();
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
 * A class that can be used to build an html element.
 */
export class HTMLBuilder extends ElementBuilder {
  constructor(text?: TextBuilder) {
    super("html", text);
  }

  /**
   * Populate this element using the provided action.
   * @param htmlAction The action that will populate this element.
   */
  public create(htmlAction?: string | ((htmlBuilder: HTMLBuilder) => void)): string {
    this.start();
    if (typeof htmlAction === "function") {
      htmlAction(this);
    } else if (htmlAction) {
      this.content(htmlAction);
    }
    this.end();
    return this.toString();
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
   * @param bodyAction The action that will populate this element.
   */
  public create(bodyAction?: string | ((bodyBuilder: BodyBuilder) => void)): string {
    this.start();
    if (typeof bodyAction === "function") {
      bodyAction(this);
    } else if (bodyAction) {
      this.content(bodyAction);
    }
    this.end();
    return this.toString();
  }

  /**
   * Add a table element to this body element's content.
   * @param tableAction The action that will create the table element.
   */
  public table(tableAction?: (tableBuilder: TableBuilder) => void): BodyBuilder {
    this.content(() => table(tableAction, this.text));
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
   * @param hAction The action that will populate this element.
   */
  public create(hAction?: string | ((hBuilder: HBuilder) => void)): string {
    this.start();
    if (typeof hAction === "function") {
      hAction(this);
    } else if (hAction) {
      this.content(hAction);
    }
    this.end();
    return this.toString();
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
   * @param tableAction The action that will populate this element.
   */
  public create(tableAction?: string | ((tableBuilder: TableBuilder) => void)): string {
    this.start();
    if (typeof tableAction === "function") {
      tableAction(this);
    } else if (tableAction) {
      this.content(tableAction);
    }
    this.end();
    return this.toString();
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
   * @param trAction The action that will populate this element.
   */
  public create(trAction?: string | ((trBuilder: TRBuilder) => void)): string {
    this.start();
    if (typeof trAction === "function") {
      trAction(this);
    } else if (trAction) {
      this.content(trAction);
    }
    this.end();
    return this.toString();
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
   * @param tdAction The action that will populate this element.
   */
  public create(tdAction?: string | ((tdBuilder: TDBuilder) => void)): string {
    this.start();
    if (typeof tdAction === "function") {
      tdAction(this);
    } else if (tdAction) {
      this.content(tdAction);
    }
    this.end();
    return this.toString();
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
   * @param aAction The action that will populate this element.
   */
  public create(aAction?: string | ((aBuilder: ABuilder) => void)): string {
    this.start();
    if (typeof aAction === "function") {
      aAction(this);
    } else if (aAction) {
      this.content(aAction);
    }
    this.end();
    return this.toString();
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
   * @param imgAction The action that will populate this element.
   */
  public create(imgAction?: string | ((imgBuilder: ImgBuilder) => void)): string {
    this.start();
    if (typeof imgAction === "function") {
      imgAction(this);
    } else if (imgAction) {
      this.content(imgAction);
    }
    this.end();
    return this.toString();
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
