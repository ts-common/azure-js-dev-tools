import { assert } from "chai";
import { a, body, BodyBuilder, h, h1, h2, h3, h4, html, HTMLBuilder, img, table, td, TextBuilder, tr } from "../lib/htmlBuilder";

describe("htmlBuilder.ts", function () {
  describe("TextBuilder", function () {
    describe("constructor()", function () {
      it("with no arguments", function () {
        const text = new TextBuilder();
        assert.strictEqual(text.toString(), "");
      });

      it("with undefined", function () {
        const text = new TextBuilder(undefined);
        assert.strictEqual(text.toString(), "");
      });

      it("with null", function () {
        // tslint:disable-next-line:no-null-keyword
        const text = new TextBuilder(null as any);
        assert.strictEqual(text.toString(), "");
      });

      it(`with ""`, function () {
        const text = new TextBuilder("");
        assert.strictEqual(text.toString(), "");
      });

      it(`with "abc"`, function () {
        const text = new TextBuilder("abc");
        assert.strictEqual(text.toString(), "abc");
      });
    });

    describe("append()", function () {
      it(`with ""`, function () {
        const text = new TextBuilder("abc");
        text.append("");
        assert.strictEqual(text.toString(), "abc");
      });

      it(`with "def"`, function () {
        const text = new TextBuilder("abc");
        text.append("def");
        assert.strictEqual(text.toString(), "abcdef");
      });
    });
  });

  describe("html()", function () {
    it("with no arguments", function () {
      assert.strictEqual(html(), "<html/>");
    });

    it("with string", function () {
      assert.strictEqual(html("hello"), "<html>hello</html>");
    });

    it("with empty action", function () {
      assert.strictEqual(html(() => { }), "<html/>");
    });

    it("with attribute", function () {
      assert.strictEqual(html(html => html.attribute("cats", "cool")), `<html cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(html(html => html.content("blah")), `<html>blah</html>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(html(undefined, textBuilder), `<html/>`);
      assert.strictEqual(textBuilder.toString(), `<html/>`);
    });
  });

  describe("body()", function () {
    it("with no arguments", function () {
      assert.strictEqual(body(), "<body/>");
    });

    it("with string", function () {
      assert.strictEqual(body("hello"), "<body>hello</body>");
    });

    it("with empty action", function () {
      assert.strictEqual(body(() => { }), "<body/>");
    });

    it("with attribute", function () {
      assert.strictEqual(body(body => body.attribute("cats", "cool")), `<body cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(body(body => body.content("blah")), `<body>blah</body>`);
    });

    it("with table", function () {
      assert.strictEqual(body(body => body.table()), `<body><table/></body>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(body(undefined, textBuilder), `<body/>`);
      assert.strictEqual(textBuilder.toString(), `<body/>`);
    });
  });

  describe("h()", function () {
    it("with no arguments", function () {
      assert.strictEqual(h(1), "<h1/>");
    });

    it("with string", function () {
      assert.strictEqual(h(7, "hello"), "<h7>hello</h7>");
    });

    it("with empty action", function () {
      assert.strictEqual(h(2, () => { }), "<h2/>");
    });

    it("with attribute", function () {
      assert.strictEqual(h(3, h3 => h3.attribute("cats", "cool")), `<h3 cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(h(4, h4 => h4.content("blah")), `<h4>blah</h4>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(h(5, undefined, textBuilder), `<h5/>`);
      assert.strictEqual(textBuilder.toString(), `<h5/>`);
    });
  });

  describe("h1()", function () {
    it("with no arguments", function () {
      assert.strictEqual(h1(), "<h1/>");
    });

    it("with string", function () {
      assert.strictEqual(h1("hello"), "<h1>hello</h1>");
    });

    it("with empty action", function () {
      assert.strictEqual(h1(() => { }), "<h1/>");
    });

    it("with attribute", function () {
      assert.strictEqual(h1(h1 => h1.attribute("cats", "cool")), `<h1 cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(h1(h1 => h1.content("blah")), `<h1>blah</h1>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(h1(undefined, textBuilder), `<h1/>`);
      assert.strictEqual(textBuilder.toString(), `<h1/>`);
    });
  });

  describe("h2()", function () {
    it("with no arguments", function () {
      assert.strictEqual(h2(), "<h2/>");
    });

    it("with string", function () {
      assert.strictEqual(h2("hello"), "<h2>hello</h2>");
    });

    it("with empty action", function () {
      assert.strictEqual(h2(() => { }), "<h2/>");
    });

    it("with attribute", function () {
      assert.strictEqual(h2(h2 => h2.attribute("cats", "cool")), `<h2 cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(h2(h2 => h2.content("blah")), `<h2>blah</h2>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(h2(undefined, textBuilder), `<h2/>`);
      assert.strictEqual(textBuilder.toString(), `<h2/>`);
    });
  });

  describe("h3()", function () {
    it("with no arguments", function () {
      assert.strictEqual(h3(), "<h3/>");
    });

    it("with string", function () {
      assert.strictEqual(h3("hello"), "<h3>hello</h3>");
    });

    it("with empty action", function () {
      assert.strictEqual(h3(() => { }), "<h3/>");
    });

    it("with attribute", function () {
      assert.strictEqual(h3(h3 => h3.attribute("cats", "cool")), `<h3 cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(h3(h3 => h3.content("blah")), `<h3>blah</h3>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(h3(undefined, textBuilder), `<h3/>`);
      assert.strictEqual(textBuilder.toString(), `<h3/>`);
    });
  });

  describe("h4()", function () {
    it("with no arguments", function () {
      assert.strictEqual(h4(), "<h4/>");
    });

    it("with string", function () {
      assert.strictEqual(h4("hello"), "<h4>hello</h4>");
    });

    it("with empty action", function () {
      assert.strictEqual(h4(() => { }), "<h4/>");
    });

    it("with attribute", function () {
      assert.strictEqual(h4(h4 => h4.attribute("cats", "cool")), `<h4 cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(h4(h4 => h4.content("blah")), `<h4>blah</h4>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(h4(undefined, textBuilder), `<h4/>`);
      assert.strictEqual(textBuilder.toString(), `<h4/>`);
    });
  });

  describe("table()", function () {
    it("with no arguments", function () {
      assert.strictEqual(table(), "<table/>");
    });

    it("with string", function () {
      assert.strictEqual(table("hello"), "<table>hello</table>");
    });

    it("with empty action", function () {
      assert.strictEqual(table(() => { }), "<table/>");
    });

    it("with attribute", function () {
      assert.strictEqual(table(table => table.attribute("cats", "cool")), `<table cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(table(table => table.content("blah")), `<table>blah</table>`);
    });

    it("with tr", function () {
      assert.strictEqual(table(table => table.tr()), `<table><tr/></table>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(table(undefined, textBuilder), `<table/>`);
      assert.strictEqual(textBuilder.toString(), `<table/>`);
    });
  });

  describe("tr()", function () {
    it("with no arguments", function () {
      assert.strictEqual(tr(), "<tr/>");
    });

    it("with string", function () {
      assert.strictEqual(tr("hello"), "<tr>hello</tr>");
    });

    it("with empty action", function () {
      assert.strictEqual(tr(() => { }), "<tr/>");
    });

    it("with attribute", function () {
      assert.strictEqual(tr(tr => tr.attribute("cats", "cool")), `<tr cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(tr(tr => tr.content("blah")), `<tr>blah</tr>`);
    });

    it("with td", function () {
      assert.strictEqual(tr(tr => tr.td()), `<tr><td/></tr>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(tr(undefined, textBuilder), `<tr/>`);
      assert.strictEqual(textBuilder.toString(), `<tr/>`);
    });
  });

  describe("td()", function () {
    it("with no arguments", function () {
      assert.strictEqual(td(), "<td/>");
    });

    it("with string", function () {
      assert.strictEqual(td("hello"), "<td>hello</td>");
    });

    it("with empty action", function () {
      assert.strictEqual(td(() => { }), "<td/>");
    });

    it("with attribute", function () {
      assert.strictEqual(td(td => td.attribute("cats", "cool")), `<td cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(td(td => td.content("blah")), `<td>blah</td>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(td(undefined, textBuilder), `<td/>`);
      assert.strictEqual(textBuilder.toString(), `<td/>`);
    });

    it("with colspan", function () {
      assert.strictEqual(td(td => td.colspan(3)), `<td colspan="3"/>`);
    });

    it("with rowspan", function () {
      assert.strictEqual(td(td => td.rowspan(10)), `<td rowspan="10"/>`);
    });
  });

  describe("a()", function () {
    it("with no arguments", function () {
      assert.strictEqual(a(), "<a/>");
    });

    it("with string", function () {
      assert.strictEqual(a("hello"), "<a>hello</a>");
    });

    it("with empty action", function () {
      assert.strictEqual(a(() => { }), "<a/>");
    });

    it("with attribute", function () {
      assert.strictEqual(a(a => a.attribute("cats", "cool")), `<a cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(a(a => a.content("blah")), `<a>blah</a>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(a(undefined, textBuilder), `<a/>`);
      assert.strictEqual(textBuilder.toString(), `<a/>`);
    });

    it("with href", function () {
      assert.strictEqual(a(a => a.href("cats")), `<a href="cats"/>`);
    });
  });

  describe("img()", function () {
    it("with no arguments", function () {
      assert.strictEqual(img(), "<img/>");
    });

    it("with string", function () {
      assert.strictEqual(img("hello"), "<img>hello</img>");
    });

    it("with empty action", function () {
      assert.strictEqual(img(() => { }), "<img/>");
    });

    it("with attribute", function () {
      assert.strictEqual(img(img => img.attribute("cats", "cool")), `<img cats="cool"/>`);
    });

    it("with content", function () {
      assert.strictEqual(img(img => img.content("blah")), `<img>blah</img>`);
    });

    it("with TextBuilder", function () {
      const textBuilder = new TextBuilder();
      assert.strictEqual(img(undefined, textBuilder), `<img/>`);
      assert.strictEqual(textBuilder.toString(), `<img/>`);
    });

    it("with src", function () {
      assert.strictEqual(img(img => img.src("blah")), `<img src="blah"/>`);
    });

    it("with alt", function () {
      assert.strictEqual(img(img => img.alt("blah")), `<img alt="blah"/>`);
    });

    it("with width", function () {
      assert.strictEqual(img(img => img.width(500)), `<img width="500"/>`);
    });

    it("with height", function () {
      assert.strictEqual(img(img => img.height(12)), `<img height="12"/>`);
    });
  });

  describe("HTMLBuilder", function () {
    describe("constructor()", function () {
      it("with no arguments", function () {
        const htmlBuilder = new HTMLBuilder();
        assert.strictEqual(htmlBuilder.toString(), "");
      });

      it("with undefined", function () {
        const htmlBuilder = new HTMLBuilder(undefined);
        assert.strictEqual(htmlBuilder.toString(), "");
      });

      it("with TextBuilder", function () {
        const textBuilder = new TextBuilder();
        const htmlBuilder = new HTMLBuilder(textBuilder);
        assert.strictEqual(textBuilder.toString(), "");
        assert.strictEqual(htmlBuilder.toString(), "");
        htmlBuilder.start();
        assert.strictEqual(textBuilder.toString(), "<html");
        assert.strictEqual(htmlBuilder.toString(), "<html");
      });
    });

    describe("body()", function () {
      it("with no arguments", function () {
        assert.strictEqual(html(html => html.body()), "<html><body/></html>");
      });
    });
  });

  describe("BodyBuilder", function () {
    describe("constructor()", function () {
      it("with no arguments", function () {
        const bodyBuilder = new BodyBuilder();
        assert.strictEqual(bodyBuilder.toString(), "");
      });

      it("with undefined", function () {
        const bodyBuilder = new BodyBuilder(undefined);
        assert.strictEqual(bodyBuilder.toString(), "");
      });

      it("with TextBuilder", function () {
        const textBuilder = new TextBuilder();
        const bodyBuilder = new BodyBuilder(textBuilder);
        assert.strictEqual(textBuilder.toString(), "");
        assert.strictEqual(bodyBuilder.toString(), "");
        bodyBuilder.start();
        assert.strictEqual(textBuilder.toString(), "<body");
        assert.strictEqual(bodyBuilder.toString(), "<body");
      });
    });
  });
});
