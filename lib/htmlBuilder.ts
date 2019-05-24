import { BuilderActions, create, TextBuilder, TextElementBuilder, repeatText } from "./textBuilder";

/**
 * Create an html element string.
 */
export function html(htmlActions?: BuilderActions<HTMLBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new HTMLBuilder(textBuilder).create(htmlActions);
}

/**
 * Create a body element string.
 */
export function body(bodyActions?: BuilderActions<BodyBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new BodyBuilder(textBuilder).create(bodyActions);
}

/**
 * Create a h element string.
 */
export function h(level: number, hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new HBuilder(level, textBuilder).create(hActions);
}

/**
 * Create a h1 element string.
 */
export function h1(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(1, hActions, textBuilder);
}

/**
 * Create a h2 element string.
 */
export function h2(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(2, hActions, textBuilder);
}

/**
 * Create a h3 element string.
 */
export function h3(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(3, hActions, textBuilder);
}

/**
 * Create a h4 element string.
 */
export function h4(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(4, hActions, textBuilder);
}

/**
 * Create a h5 element string.
 */
export function h5(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(5, hActions, textBuilder);
}

/**
 * Create a h6 element string.
 */
export function h6(hActions?: BuilderActions<HBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return h(6, hActions, textBuilder);
}

/**
 * Create a table element string.
 */
export function table(tableActions?: BuilderActions<TableBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new TableBuilder(textBuilder).create(tableActions);
}

/**
 * Create a tr element string.
 */
export function tr(trActions?: BuilderActions<TRBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new TRBuilder(textBuilder).create(trActions);
}

/**
 * Create a td element string.
 */
export function td(tdActions?: BuilderActions<TDBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new TDBuilder(textBuilder).create(tdActions);
}

/**
 * Create a a element string.
 */
export function a(aActions?: BuilderActions<ABuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new ABuilder(textBuilder).create(aActions);
}

/**
 * Create a img element string.
 */
export function img(imgActions?: BuilderActions<ImgBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new ImgBuilder(textBuilder).create(imgActions);
}

/**
 * Create a details element string.
 */
export function details(actions?: BuilderActions<DetailsBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new DetailsBuilder(textBuilder).create(actions);
}

/**
 * Create a summary element string.
 */
export function summary(actions?: BuilderActions<SummaryBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new SummaryBuilder(textBuilder).create(actions);
}

/**
 * Create a ul element string.
 */
export function ul(actions?: BuilderActions<ULBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new ULBuilder(textBuilder).create(actions);
}

/**
 * Create an li element string.
 */
export function li(actions?: BuilderActions<LIBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new LIBuilder(textBuilder).create(actions);
}

/**
 * Create an br element string.
 */
export function br(actions?: BuilderActions<BRBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new BRBuilder(textBuilder).create(actions);
}

/**
 * Create a blockquote element string.
 */
export function blockquote(actions?: BuilderActions<BlockQuoteBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new BlockQuoteBuilder(textBuilder).create(actions);
}

/**
 * Create a b element string.
 */
export function b(actions?: BuilderActions<BBuilder>, textBuilder: TextBuilder = new TextBuilder()): string {
  return new BodyBuilder(textBuilder).create(actions);
}


/**
 * A class that can be used to create a generic HTML element.
 */
export class HTMLElementBuilder implements TextElementBuilder {
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
  public attribute(attributeName: string, attributeValue: string | number): HTMLElementBuilder {
    this.text.append(` ${attributeName}="${attributeValue.toString()}"`);
    return this;
  }

  /**
   * Add the provided content to this element. This will close the start tag of the element if it
   * was open.
   * @param actions The content to add to the element.
   */
  public content(actions: BuilderActions<HTMLElementBuilder>): HTMLElementBuilder {
    if (typeof actions === "string" || typeof actions === "function") {
      actions = [actions];
    }
    for (const contentAction of actions) {
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
   * Append newline characters to the content of this HTML element. This will close the start tag if
   * it is still open.
   */
  public contentNewLine(count = 1): HTMLElementBuilder {
    this.content(repeatText("\n", count));
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
export class HTMLBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("html", text);
  }

  /**
   * Populate this element using the provided action.
   * @param htmlActions The actions that will populate this element.
   */
  public create(htmlActions?: BuilderActions<HTMLBuilder>): string {
    return create(this, htmlActions);
  }

  /**
   * Add a body element to this html element's content.
   * @param bodyActions The action that will create the body element.
   */
  public body(bodyActions?: BuilderActions<BodyBuilder>): HTMLBuilder {
    this.content(body(bodyActions));
    return this;
  }
}

/**
 * A class that can be used to build a body element.
 */
export class BodyBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("body", text);
  }

  /**
   * Populate this element using the provided action.
   * @param bodyActions The actions that will populate this element.
   */
  public create(bodyActions?: BuilderActions<BodyBuilder>): string {
    return create(this, bodyActions);
  }

  /**
   * Create a bold element in this body element.
   * @param bActions The actions that will populate this element.
   */
  public b(bActions?: BuilderActions<BBuilder>): BodyBuilder {
    this.content(b(bActions));
    return this;
  }

  /**
   * Create a header element in this body element.
   * @param level The level of the header.
   * @param hActions The actions to use to populate the header element.
   */
  public h(level: number, hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h(level, hActions));
    return this;
  }

  /**
   * Create a h1 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h1(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h1(hActions));
    return this;
  }

  /**
   * Create a h2 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h2(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h2(hActions));
    return this;
  }

  /**
   * Create a h3 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h3(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h3(hActions));
    return this;
  }

  /**
   * Create a h4 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h4(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h4(hActions));
    return this;
  }

  /**
   * Create a h5 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h5(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h5(hActions));
    return this;
  }

  /**
   * Create a h6 element in this body element.
   * @param hActions The actions to use to populate the header element.
   */
  public h6(hActions?: BuilderActions<HBuilder>): BodyBuilder {
    this.content(h6(hActions));
    return this;
  }

  /**
   * Add a table element to this body element's content.
   * @param tableAction The action that will create the table element.
   */
  public table(tableActions?: BuilderActions<TableBuilder>): BodyBuilder {
    this.content(table(tableActions));
    return this;
  }

  /**
   * Add a ul element to this body element's content.
   * @param ulActions The actions that will create the ul element.
   */
  public ul(ulActions?: BuilderActions<ULBuilder>): BodyBuilder {
    this.content(ul(ulActions));
    return this;
  }

  /**
   * Add a details element to this body element's content.
   * @param detailsActions The actions that will create the details element.
   */
  public details(detailsActions?: BuilderActions<DetailsBuilder>): BodyBuilder {
    this.content(details(detailsActions));
    return this;
  }

  /**
   * Add a br element to this body element's content.
   * @param brActions The actions that will create the br element.
   */
  public br(brActions?: BuilderActions<BRBuilder>): BodyBuilder {
    this.content(br(brActions));
    return this;
  }
}

/**
 * A class that can be used to build an h element.
 */
export class HBuilder extends HTMLElementBuilder {
  constructor(level: number, text?: TextBuilder) {
    super(`h${level}`, text);
  }

  /**
   * Populate this element using the provided action.
   * @param hActions The actions that will populate this element.
   */
  public create(hActions?: BuilderActions<HBuilder>): string {
    return create(this, hActions);
  }

  /**
   * Add an a element to this h element's content.
   * @param aAction The action that will create the tr element.
   */
  public a(aActions?: BuilderActions<ABuilder>): HBuilder {
    this.content(a(aActions));
    return this;
  }
}

/**
 * A class that can be used to build a table element.
 */
export class TableBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("table", text);
  }

  /**
   * Populate this element using the provided action.
   * @param tableActions The actions that will populate this element.
   */
  public create(tableActions?: BuilderActions<TableBuilder>): string {
    return create(this, tableActions);
  }

  /**
   * Add a border attribute to this table element.
   * @param value The value of the border attribute.
   */
  public border(value: number): TableBuilder {
    this.attribute("border", value);
    return this;
  }

  /**
   * Add a tr element to this table element's content.
   * @param trAction The action that will create the tr element.
   */
  public tr(trActions?: BuilderActions<TRBuilder>): TableBuilder {
    this.content(tr(trActions));
    return this;
  }
}

/**
 * A class that can be used to build a tr element.
 */
export class TRBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("tr", text);
  }

  /**
   * Populate this element using the provided action.
   * @param trActions The actions that will populate this element.
   */
  public create(trActions?: BuilderActions<TRBuilder>): string {
    return create(this, trActions);
  }

  /**
   * Add a td element to this tr element's content.
   * @param tdActions The action that will create the td element.
   */
  public td(tdActions?: BuilderActions<TDBuilder>): TRBuilder {
    this.content(td(tdActions));
    return this;
  }
}

/**
 * A class that can be used to build a td element.
 */
export class TDBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("td", text);
  }

  /**
   * Populate this element using the provided action.
   * @param tdActions The actions that will populate this element.
   */
  public create(tdActions?: BuilderActions<TDBuilder>): string {
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
  public a(aActions?: BuilderActions<ABuilder>): TDBuilder {
    this.content(a(aActions));
    return this;
  }

  /**
   * Create a bold element in this td element.
   * @param bActions The actions that will populate this element.
   */
  public b(bActions?: BuilderActions<BBuilder>): TDBuilder {
    this.content(b(bActions));
    return this;
  }

  /**
   * Create a header element in this td element.
   * @param level The level of the header.
   * @param hActions The actions to use to populate the header element.
   */
  public h(level: number, hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h(level, hActions));
    return this;
  }

  /**
   * Create a h1 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h1(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h1(hActions));
    return this;
  }

  /**
   * Create a h2 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h2(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h2(hActions));
    return this;
  }

  /**
   * Create a h3 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h3(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h3(hActions));
    return this;
  }

  /**
   * Create a h4 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h4(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h4(hActions));
    return this;
  }

  /**
   * Create a h5 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h5(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h5(hActions));
    return this;
  }

  /**
   * Create a h6 element in this td element.
   * @param hActions The actions to use to populate the header element.
   */
  public h6(hActions?: BuilderActions<HBuilder>): TDBuilder {
    this.content(h6(hActions));
    return this;
  }

  /**
   * Create a img element in this td element.
   * @param imgActions The actions to use to populate the img element.
   */
  public img(imgActions?: BuilderActions<ImgBuilder>): TDBuilder {
    this.content(img(imgActions));
    return this;
  }
}

/**
 * A class that can be used to build an a element.
 */
export class ABuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("a", text);
  }

  /**
   * Populate this element using the provided action.
   * @param aActions The actions that will populate this element.
   */
  public create(aActions?: BuilderActions<ABuilder>): string {
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
export class ImgBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("img", text);
  }

  /**
   * Populate this element using the provided action.
   * @param imgActions The actions that will populate this element.
   */
  public create(imgActions?: BuilderActions<ImgBuilder>): string {
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

/**
 * A class that can be used to build a details element.
 */
export class DetailsBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("details", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<DetailsBuilder>): string {
    return create(this, actions);
  }

  /**
   * Add a summary element to this details element.
   * @param actions The actions used to populate the summary element.
   */
  public summary(actions: BuilderActions<SummaryBuilder>): DetailsBuilder {
    this.content(summary(actions));
    return this;
  }

  /**
   * Add a blockquote element to this details element.
   * @param actions The actions used to populate the blockquote element.
   */
  public blockquote(actions: BuilderActions<BlockQuoteBuilder>): DetailsBuilder {
    this.content(blockquote(actions));
    return this;
  }

  /**
   * Add a ul element to this details element.
   * @param actions The actions used to populate the ul element.
   */
  public ul(actions: BuilderActions<ULBuilder>): DetailsBuilder {
    this.content(ul(actions));
    return this;
  }
}

/**
 * A class that can be used to build a summary element.
 */
export class SummaryBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("summary", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<SummaryBuilder>): string {
    return create(this, actions);
  }
}

/**
 * A class that can be used to build a ul element.
 */
export class ULBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("ul", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<ULBuilder>): string {
    return create(this, actions);
  }

  /**
   * Add an li element to this ul element.
   * @param actions The actions used to populate the li element.
   */
  public li(actions?: BuilderActions<LIBuilder>): ULBuilder {
    this.content(li(actions));
    return this;
  }
}

/**
 * A class that can be used to build a li element.
 */
export class LIBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("li", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<LIBuilder>): string {
    return create(this, actions);
  }

  /**
   * Add a ul element to this li element's content.
   * @param ulActions The actions that will create the ul element.
   */
  public ul(ulActions?: BuilderActions<ULBuilder>): LIBuilder {
    this.content(ul(ulActions));
    return this;
  }

  /**
   * Add a details element to this body element's content.
   * @param detailsActions The actions that will create the details element.
   */
  public details(detailsActions?: BuilderActions<DetailsBuilder>): LIBuilder {
    this.content(details(detailsActions));
    return this;
  }
}

/**
 * A class that can be used to build a br element.
 */
export class BRBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("br", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<BRBuilder>): string {
    return create(this, actions);
  }
}

/**
 * A class that can be used to build a blockquote element.
 */
export class BlockQuoteBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("blockquote", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<BlockQuoteBuilder>): string {
    return create(this, actions);
  }

  /**
   * Add a ul element to this blockquote element's content.
   * @param ulActions The actions that will create the ul element.
   */
  public ul(ulActions?: BuilderActions<ULBuilder>): BlockQuoteBuilder {
    this.content(ul(ulActions));
    return this;
  }

  /**
   * Add a details element to this blockquote element's content.
   * @param detailsActions The actions that will create the details element.
   */
  public details(detailsActions?: BuilderActions<DetailsBuilder>): BlockQuoteBuilder {
    this.content(details(detailsActions));
    return this;
  }
}

/**
 * A class that can be used to build a b element.
 */
export class BBuilder extends HTMLElementBuilder {
  constructor(text?: TextBuilder) {
    super("b", text);
  }

  /**
   * Populate this element using the provided action.
   * @param actions The actions that will populate this element.
   */
  public create(actions?: BuilderActions<BBuilder>): string {
    return create(this, actions);
  }
}
