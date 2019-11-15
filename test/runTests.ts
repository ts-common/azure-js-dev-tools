import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { commandToString, ensureQuoted, FakeRunner, parseCommand, parseCommands, parseCommandToken, parseCommandTokens, run, RunResult } from "../lib/run";

describe("run.ts", function () {
  describe("commandToString()", function () {
    it("with executable with no spaces", function () {
      assert.strictEqual(commandToString({ executable: `my.exe` }), `my.exe`);
    });

    it("with executable with spaces", function () {
      assert.strictEqual(commandToString({ executable: `my really cool.exe` }), `"my really cool.exe"`);
    });

    it("with empty args", function () {
      assert.strictEqual(commandToString({ executable: "a", args: [] }), "a");
    });

    it("with non-empty args with empty argument values", function () {
      assert.strictEqual(commandToString({ executable: "a", args: ["", "", ""] }), "a");
    });

    it("with non-empty args with non-empty argument values with no spaces", function () {
      assert.strictEqual(commandToString({ executable: "a", args: ["b", "c", "d"] }), "a b c d");
    });

    it("with non-empty args with non-empty argument values with spaces", function () {
      assert.strictEqual(commandToString({ executable: "a", args: ["b", "c d", "e f g"] }), `a b "c d" "e f g"`);
    });
  });

  describe("ensureQuoted()", function () {
    describe("with no quote provided", function () {
      it(`with ""`, function () {
        assert.strictEqual(ensureQuoted(``), `""`);
      });

      it(`with " "`, function () {
        assert.strictEqual(ensureQuoted(` `), `" "`);
      });

      it(`with "abc"`, function () {
        assert.strictEqual(ensureQuoted(`abc`), `"abc"`);
      });

      it(`with ""abc"`, function () {
        assert.strictEqual(ensureQuoted(`"abc`), `"\\"abc"`);
      });

      it(`with "abc""`, function () {
        assert.strictEqual(ensureQuoted(`abc"`), `"abc\\""`);
      });

      it(`with ""abc""`, function () {
        assert.strictEqual(ensureQuoted(`"abc"`), `"abc"`);
      });

      it(`with "'abc"`, function () {
        assert.strictEqual(ensureQuoted(`'abc`), `"'abc"`);
      });

      it(`with "abc'"`, function () {
        assert.strictEqual(ensureQuoted(`abc'`), `"abc'"`);
      });

      it(`with "'abc'`, function () {
        assert.strictEqual(ensureQuoted(`'abc'`), `"'abc'"`);
      });
    });

    describe("with empty quote provided", function () {
      it(`with ""`, function () {
        assert.strictEqual(ensureQuoted(``, ``), ``);
      });

      it(`with " "`, function () {
        assert.strictEqual(ensureQuoted(` `, ``), ` `);
      });

      it(`with "abc"`, function () {
        assert.strictEqual(ensureQuoted(`abc`, ``), `abc`);
      });

      it(`with ""abc"`, function () {
        assert.strictEqual(ensureQuoted(`"abc`, ``), `"abc`);
      });

      it(`with "abc""`, function () {
        assert.strictEqual(ensureQuoted(`abc"`, ``), `abc"`);
      });

      it(`with ""abc""`, function () {
        assert.strictEqual(ensureQuoted(`"abc"`, ``), `"abc"`);
      });

      it(`with "'abc"`, function () {
        assert.strictEqual(ensureQuoted(`'abc`, ``), `'abc`);
      });

      it(`with "abc'`, function () {
        assert.strictEqual(ensureQuoted(`abc'`, ``), `abc'`);
      });

      it(`with "'abc'`, function () {
        assert.strictEqual(ensureQuoted(`'abc'`, ``), `'abc'`);
      });
    });

    describe("with single quote provided", function () {
      it(`with ""`, function () {
        assert.strictEqual(ensureQuoted(``, `'`), `''`);
      });

      it(`with " "`, function () {
        assert.strictEqual(ensureQuoted(` `, `'`), `' '`);
      });

      it(`with "abc"`, function () {
        assert.strictEqual(ensureQuoted(`abc`, `'`), `'abc'`);
      });

      it(`with ""abc"`, function () {
        assert.strictEqual(ensureQuoted(`"abc`, `'`), `'"abc'`);
      });

      it(`with "abc""`, function () {
        assert.strictEqual(ensureQuoted(`abc"`, `'`), `'abc"'`);
      });

      it(`with ""abc""`, function () {
        assert.strictEqual(ensureQuoted(`"abc"`, `'`), `'"abc"'`);
      });

      it(`with "'abc"`, function () {
        assert.strictEqual(ensureQuoted(`'abc`, `'`), `'\\'abc'`);
      });

      it(`with "abc'`, function () {
        assert.strictEqual(ensureQuoted(`abc'`, `'`), `'abc\\''`);
      });

      it(`with "'abc'`, function () {
        assert.strictEqual(ensureQuoted(`'abc'`, `'`), `'abc'`);
      });
    });

    describe("with non-quote (a) provided", function () {
      it(`with ""`, function () {
        assert.strictEqual(ensureQuoted(``, `a`), `aa`);
      });

      it(`with " "`, function () {
        assert.strictEqual(ensureQuoted(` `, `a`), `a a`);
      });

      it(`with "abc"`, function () {
        assert.strictEqual(ensureQuoted(`abc`, `a`), `aabca`);
      });

      it(`with ""abc"`, function () {
        assert.strictEqual(ensureQuoted(`"abc`, `a`), `a"abca`);
      });

      it(`with "abc""`, function () {
        assert.strictEqual(ensureQuoted(`abc"`, `a`), `aabc"a`);
      });

      it(`with ""abc""`, function () {
        assert.strictEqual(ensureQuoted(`"abc"`, `a`), `a"abc"a`);
      });

      it(`with "'abc"`, function () {
        assert.strictEqual(ensureQuoted(`'abc`, `a`), `a'abca`);
      });

      it(`with "abc'"`, function () {
        assert.strictEqual(ensureQuoted(`abc'`, `a`), `aabc'a`);
      });

      it(`with "'abc'"`, function () {
        assert.strictEqual(ensureQuoted(`'abc'`, `a`), `a'abc'a`);
      });

      it(`with "abca"`, function () {
        assert.strictEqual(ensureQuoted(`abca`, `a`), `abca`);
      });
    });
  });

  describe("parseCommandToken()", function () {
    it(`with "" and -1`, function () {
      assert.strictEqual(parseCommandToken(``, -1), undefined);
    });

    it(`with "" and 0`, function () {
      assert.strictEqual(parseCommandToken(``, 0), undefined);
    });

    it(`with "" and 1`, function () {
      assert.strictEqual(parseCommandToken(``, 1), undefined);
    });

    it(`with "   " and -1`, function () {
      assert.strictEqual(parseCommandToken(`   `, -1), undefined);
    });

    it(`with "   " and 0`, function () {
      assert.deepEqual(parseCommandToken(`   `, 0), {
        text: "   ",
        startIndex: 0,
        endIndex: 3,
        isWhitespace: true,
      });
    });

    it(`with "   " and 1`, function () {
      assert.deepEqual(parseCommandToken(`   `, 1), {
        text: "  ",
        startIndex: 1,
        endIndex: 3,
        isWhitespace: true,
      });
    });

    it(`with "   " and 3`, function () {
      assert.strictEqual(parseCommandToken(`   `, 3), undefined);
    });

    it(`with "ab" and -1`, function () {
      assert.strictEqual(parseCommandToken(`ab`, -1), undefined);
    });

    it(`with "ab" and 0`, function () {
      assert.deepEqual(parseCommandToken(`ab`, 0), {
        text: "ab",
        startIndex: 0,
        endIndex: 2,
      });
    });

    it(`with "ab" and 1`, function () {
      assert.deepEqual(parseCommandToken(`ab`, 1), {
        text: "b",
        startIndex: 1,
        endIndex: 2,
      });
    });

    it(`with "ab" and 2`, function () {
      assert.strictEqual(parseCommandToken(`ab`, 2), undefined);
    });

    it(`with "a b " and -1`, function () {
      assert.strictEqual(parseCommandToken(`a b `, -1), undefined);
    });

    it(`with "a b " and 0`, function () {
      assert.deepEqual(parseCommandToken(`a b `, 0), {
        text: "a",
        startIndex: 0,
        endIndex: 1,
      });
    });

    it(`with "a b " and 1`, function () {
      assert.deepEqual(parseCommandToken(`a b `, 1), {
        text: " ",
        startIndex: 1,
        endIndex: 2,
        isWhitespace: true,
      });
    });

    it(`with "a b " and 4`, function () {
      assert.strictEqual(parseCommandToken(`a b `, 4), undefined);
    });

    it(`with "'a b '" and -1`, function () {
      assert.strictEqual(parseCommandToken(`'a b '`, -1), undefined);
    });

    it(`with "'a b " and 0`, function () {
      assert.deepEqual(parseCommandToken(`'a b `, 0), {
        text: "'a b ",
        startIndex: 0,
        endIndex: 5,
      });
    });

    it(`with "'a b '" and 0`, function () {
      assert.deepEqual(parseCommandToken(`'a b '`, 0), {
        text: "'a b '",
        startIndex: 0,
        endIndex: 6,
      });
    });

    it(`with "'a b \\' c" and 0`, function () {
      assert.deepEqual(parseCommandToken(`'a b \\' c`, 0), {
        text: "'a b \\' c",
        startIndex: 0,
        endIndex: 9,
      });
    });

    it(`with "'a b \\' c' d" and 0`, function () {
      assert.deepEqual(parseCommandToken(`'a b \\' c' d`, 0), {
        text: "'a b \\' c'",
        startIndex: 0,
        endIndex: 10,
      });
    });

    it(`with "'a b '" and 1`, function () {
      assert.deepEqual(parseCommandToken(`'a b '`, 1), {
        text: "a",
        startIndex: 1,
        endIndex: 2,
      });
    });

    it(`with "'a b '" and 6`, function () {
      assert.strictEqual(parseCommandToken(`'a b '`, 6), undefined);
    });

    it(`with "--args='a',b,'c d'" and 0`, function () {
      assert.deepEqual(parseCommandToken(`--args='a',b,'c d'`, 0), {
        text: "--args='a',b,'c d'",
        startIndex: 0,
        endIndex: 18,
      });
    });
  });

  describe("parseCommandTokens()", function () {
    it(`with ""`, function () {
      assert.deepEqual(parseCommandTokens(""), []);
    });

    it(`with "    "`, function () {
      assert.deepEqual(parseCommandTokens("    "), []);
    });

    it(`with "a"`, function () {
      assert.deepEqual(parseCommandTokens("a"), [
        {
          text: "a",
          startIndex: 0,
          endIndex: 1,
        }
      ]);
    });

    it(`with "a b 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommandTokens("a b 'c' 'd e'"), [
        {
          text: "a",
          startIndex: 0,
          endIndex: 1,
        },
        {
          text: "b",
          startIndex: 2,
          endIndex: 3,
        },
        {
          text: "'c'",
          startIndex: 4,
          endIndex: 7,
        },
        {
          text: "'d e'",
          startIndex: 8,
          endIndex: 13,
        }
      ]);
    });
  });

  describe("parseCommand()", function () {
    it(`with ""`, function () {
      assert.strictEqual(parseCommand(""), undefined);
    });

    it(`with "    "`, function () {
      assert.strictEqual(parseCommand("    "), undefined);
    });

    it(`with "a"`, function () {
      assert.deepEqual(parseCommand("a"), {
        executable: "a",
        args: [],
      });
    });

    it(`with "a b 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommand("a b 'c' 'd e'"), {
        executable: "a",
        args: [
          "b",
          "'c'",
          "'d e'",
        ]
      });
    });

    it(`with "a b & 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommand("a b & 'c' 'd e'"), {
        executable: "a",
        args: [
          "b",
          "&",
          "'c'",
          "'d e'",
        ]
      });
    });

    it(`with "a b && 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommand("a b && 'c' 'd e'"), {
        executable: "a",
        args: [
          "b",
          "&&",
          "'c'",
          "'d e'",
        ]
      });
    });

    it(`with "a b || 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommand("a b || 'c' 'd e'"), {
        executable: "a",
        args: [
          "b",
          "||",
          "'c'",
          "'d e'",
        ]
      });
    });
  });

  describe("parseCommands()", function () {
    it(`with ""`, function () {
      assert.deepEqual(parseCommands(""), []);
    });

    it(`with "    "`, function () {
      assert.deepEqual(parseCommands("    "), []);
    });

    it(`with "a"`, function () {
      assert.deepEqual(parseCommands("a"), [
        {
          executable: "a",
          args: [],
        }
      ]);
    });

    it(`with "a b 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommands("a b 'c' 'd e'"), [
        {
          executable: "a",
          args: [
            "b",
            "'c'",
            "'d e'",
          ]
        }
      ]);
    });

    it(`with "a b & 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommands("a b & 'c' 'd e'"), [
        {
          executable: "a",
          args: [
            "b",
          ]
        },
        {
          executable: "'c'",
          args: [
            "'d e'"
          ]
        }
      ]);
    });

    it(`with "a b && 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommands("a b && 'c' 'd e'"), [
        {
          executable: "a",
          args: [
            "b",
          ]
        },
        {
          executable: "'c'",
          args: [
            "'d e'",
          ]
        }
      ]);
    });

    it(`with "a b || 'c' 'd e'"`, function () {
      assert.deepEqual(parseCommands("a b || 'c' 'd e'"), [
        {
          executable: "a",
          args: [
            "b",
            "||",
            "'c'",
            "'d e'",
          ]
        }
      ]);
    });

    it(`with "& && & &&"`, function () {
      assert.deepEqual(parseCommands("& && & &&"), []);
    });

    it(`with "a & b && 'c' & 'd e'"`, function () {
      assert.deepEqual(parseCommands("a & b && 'c' & 'd e'"), [
        {
          executable: "a",
          args: []
        },
        {
          executable: "b",
          args: []
        },
        {
          executable: "'c'",
          args: []
        },
        {
          executable: "'d e'",
          args: []
        }
      ]);
    });
  });

  describe("FakeRunner", function () {
    describe("run()", function () {
      it("with no registered result and single string arg", async function () {
        const runner = new FakeRunner();
        const error: Error = await assertEx.throwsAsync(runner.run({ executable: "git", args: ["status"] }));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "git status" at "${process.cwd()}".`);
      });

      it("with registered result and args array", async function () {
        const runner = new FakeRunner();
        const registeredResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
        runner.set({ executable: "git", args: ["fetch", "--prune"], result: registeredResult });
        const result: RunResult = await runner.run({ executable: "git", args: ["fetch", "--prune"] });
        assert.deepEqual(result, registeredResult);
      });

      it("with undefined registered result", async function () {
        const runner = new FakeRunner();
        runner.set({ executable: "git", args: ["fetch", "--prune"] });
        const result: RunResult = await runner.run({ executable: "git", args: ["fetch", "--prune"] });
        assert.deepEqual(result, { exitCode: 0 });
      });

      it("with passthrough command", async function () {
        const innerRunner = new FakeRunner();
        const registeredResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
        innerRunner.set({ executable: "git", args: ["fetch", "--prune"], result: registeredResult });

        const runner = new FakeRunner(innerRunner);
        runner.passthrough({ executable: "git", args: ["fetch", "--prune"] });

        const result: RunResult = await runner.run({ executable: "git", args: ["fetch", "--prune"] });
        assert.deepEqual(result, registeredResult);
      });

      it("with registered command with different executionFolderPath", async function () {
        const runner = new FakeRunner();
        runner.set({ executable: "fake-command", executionFolderPath: "/a/b/c" });
        const error: Error = await assertEx.throwsAsync(runner.run({ executable: "fake-command", args: [] }));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "fake-command" at "${process.cwd()}".`);
      });

      it("with registered command with same executionFolderPath", async function () {
        const runner = new FakeRunner();
        runner.set({ executable: "fake-command", executionFolderPath: "/a/b/c", result: { exitCode: 2 } });
        const result: RunResult = await runner.run({ executable: "fake-command", args: [] }, { executionFolderPath: "/a/b/c" });
        assert.deepEqual(result, {
          exitCode: 2
        });
      });

      it("with multiple registered commands", async function () {
        const runner = new FakeRunner();
        runner.set({ executable: "fake-command", result: { exitCode: 2 } });
        runner.set({ executable: "fake-command", result: { exitCode: 3 } });
        const result: RunResult = await runner.run({ executable: "fake-command" });
        assert.deepEqual(result, {
          exitCode: 3
        });
      });

      it("with passthroughUnrecognized() called", async function () {
        const runner = new FakeRunner();
        runner.passthroughUnrecognized();

        const result: RunResult = await runner.run({ executable: "git", args: ["fetch", "--prune"] });
        assertEx.defined(result, "result");
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.exitCode, 0);
      });
    });
  });

  describe("run()", function () {
    this.timeout(10000);

    it("with dir", async function () {
      const result: RunResult = await run("dir");
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: false", async function () {
      const result: RunResult = await run("dir", [], { captureOutput: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, undefined);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: true", async function () {
      const result: RunResult = await run("dir", [], { captureOutput: true });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: function", async function () {
      let capturedOutput = "";
      const result: RunResult = await run("dir", [], { captureOutput: (text: string) => capturedOutput += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(capturedOutput, "README.md");
      assertEx.contains(capturedOutput, "package.json");
      assert.strictEqual(result.stdout, capturedOutput);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureError: false", async function () {
      const result: RunResult = await run("dir", [], { captureError: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, undefined);
    });

    it("with dir and captureError: function", async function () {
      let capturedError = "";
      const result: RunResult = await run("dir", [], { captureError: (text: string) => capturedError += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
      assert.strictEqual(capturedError, "");
    });

    it("with dir and log and showResult defined", async function () {
      let capturedOutput = "";
      const result: RunResult = await run("dir", [], { log: (text: string) => capturedOutput += text, showResult: true });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
      assertEx.contains(capturedOutput, "dir");
      assertEx.contains(capturedOutput, "Exit Code: 0");
      assertEx.contains(capturedOutput, "Output:");
      assertEx.contains(capturedOutput, "README.md");
    });

    it("with non-existing executionFolderPath", async function () {
      const result: RunResult = await run("dir", [], { executionFolderPath: "/i/dont/exist" });
      assertEx.defined(result);
      assert.strictEqual(result.exitCode, undefined);
      assert.strictEqual(result.stdout, undefined);
      assert.strictEqual(result.stderr, undefined);
      assert.strictEqual(result.processId, undefined);
      assertEx.defined(result.error);
      assert.strictEqual(result.error!.message, "spawn dir ENOENT");
    });
  });
});
