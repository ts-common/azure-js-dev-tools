import { assert } from "chai";
import { InMemoryLogger, getInMemoryLogger, wrapLogger, Logger, getConsoleLogger, getAzureDevOpsLogger, getCompositeLogger } from "../lib";

describe("logger.ts", function () {
  describe("getCompositeLogger()", function () {
    it("logInfo()", async function () {
      const logger1: InMemoryLogger = getInMemoryLogger();
      const logger2: InMemoryLogger = getInMemoryLogger();
      const logger3: InMemoryLogger = getInMemoryLogger({ logInfo: false });
      const logger: Logger = getCompositeLogger(logger1, logger2, logger3);
      await logger.logInfo("test info");
      assert.deepEqual(logger1.allLogs, ["test info"]);
      assert.deepEqual(logger1.infoLogs, ["test info"]);
      assert.deepEqual(logger2.allLogs, ["test info"]);
      assert.deepEqual(logger2.infoLogs, ["test info"]);
      assert.deepEqual(logger3.allLogs, []);
      assert.deepEqual(logger3.infoLogs, []);
    });

    it("logError()", async function () {
      const logger1: InMemoryLogger = getInMemoryLogger();
      const logger2: InMemoryLogger = getInMemoryLogger();
      const logger3: InMemoryLogger = getInMemoryLogger({ logError: false });
      const logger: Logger = getCompositeLogger(logger1, logger2, logger3);
      await logger.logError("test error");
      assert.deepEqual(logger1.allLogs, ["test error"]);
      assert.deepEqual(logger1.errorLogs, ["test error"]);
      assert.deepEqual(logger2.allLogs, ["test error"]);
      assert.deepEqual(logger2.errorLogs, ["test error"]);
      assert.deepEqual(logger3.allLogs, []);
      assert.deepEqual(logger3.errorLogs, []);
    });

    it("logSection()", async function () {
      const logger1: InMemoryLogger = getInMemoryLogger();
      const logger2: InMemoryLogger = getInMemoryLogger();
      const logger3: InMemoryLogger = getInMemoryLogger({ logSection: false });
      const logger: Logger = getCompositeLogger(logger1, logger2, logger3);
      await logger.logSection("test section");
      assert.deepEqual(logger1.allLogs, ["test section"]);
      assert.deepEqual(logger1.sectionLogs, ["test section"]);
      assert.deepEqual(logger2.allLogs, ["test section"]);
      assert.deepEqual(logger2.sectionLogs, ["test section"]);
      assert.deepEqual(logger3.allLogs, []);
      assert.deepEqual(logger3.sectionLogs, []);
    });

    it("logVerbose()", async function () {
      const logger1: InMemoryLogger = getInMemoryLogger({ logVerbose: true });
      const logger2: InMemoryLogger = getInMemoryLogger({ logVerbose: true });
      const logger3: InMemoryLogger = getInMemoryLogger({ logVerbose: false });
      const logger: Logger = getCompositeLogger(logger1, logger2, logger3);
      await logger.logVerbose("test verbose");
      assert.deepEqual(logger1.allLogs, ["test verbose"]);
      assert.deepEqual(logger1.verboseLogs, ["test verbose"]);
      assert.deepEqual(logger2.allLogs, ["test verbose"]);
      assert.deepEqual(logger2.verboseLogs, ["test verbose"]);
      assert.deepEqual(logger3.allLogs, []);
      assert.deepEqual(logger3.verboseLogs, []);
    });

    it("logWarning()", async function () {
      const logger1: InMemoryLogger = getInMemoryLogger();
      const logger2: InMemoryLogger = getInMemoryLogger();
      const logger3: InMemoryLogger = getInMemoryLogger({ logWarning: false });
      const logger: Logger = getCompositeLogger(logger1, logger2, logger3);
      await logger.logWarning("test warning");
      assert.deepEqual(logger1.allLogs, ["test warning"]);
      assert.deepEqual(logger1.warningLogs, ["test warning"]);
      assert.deepEqual(logger2.allLogs, ["test warning"]);
      assert.deepEqual(logger2.warningLogs, ["test warning"]);
      assert.deepEqual(logger3.allLogs, []);
      assert.deepEqual(logger3.warningLogs, []);
    });
  });

  it("getConsoleLogger()", function () {
    const logger: Logger = getConsoleLogger();
    assert(logger);
    assert(logger.logError);
    assert(logger.logInfo);
    assert(logger.logSection);
    assert(logger.logVerbose);
    assert(logger.logWarning);
  });

  describe("getAzureDevopsLogger()", function () {
    it("with no options", function () {
      const logger: Logger = getAzureDevOpsLogger();
      assert(logger);
      assert(logger.logError);
      assert(logger.logInfo);
      assert(logger.logSection);
      assert(logger.logVerbose);
      assert(logger.logWarning);
    });

    it("with empty options", function () {
      const logger: Logger = getAzureDevOpsLogger({});
      assert(logger);
      assert(logger.logError);
      assert(logger.logInfo);
      assert(logger.logSection);
      assert(logger.logVerbose);
      assert(logger.logWarning);
    });

    it("with toWrap logger", async function () {
      const inMemoryLogger: InMemoryLogger = getInMemoryLogger({ logVerbose: true });
      const logger: Logger = getAzureDevOpsLogger({ toWrap: inMemoryLogger });

      await logger.logError("a");
      assert.deepEqual(inMemoryLogger.allLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.errorLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.infoLogs, []);
      assert.deepEqual(inMemoryLogger.sectionLogs, []);
      assert.deepEqual(inMemoryLogger.warningLogs, []);
      assert.deepEqual(inMemoryLogger.verboseLogs, []);

      await logger.logInfo("b");
      assert.deepEqual(inMemoryLogger.allLogs, ["##[error]a", "b"]);
      assert.deepEqual(inMemoryLogger.errorLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.infoLogs, ["b"]);
      assert.deepEqual(inMemoryLogger.sectionLogs, []);
      assert.deepEqual(inMemoryLogger.warningLogs, []);
      assert.deepEqual(inMemoryLogger.verboseLogs, []);

      await logger.logSection("c");
      assert.deepEqual(inMemoryLogger.allLogs, ["##[error]a", "b", "##[section]c"]);
      assert.deepEqual(inMemoryLogger.errorLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.infoLogs, ["b"]);
      assert.deepEqual(inMemoryLogger.sectionLogs, ["##[section]c"]);
      assert.deepEqual(inMemoryLogger.warningLogs, []);
      assert.deepEqual(inMemoryLogger.verboseLogs, []);

      await logger.logWarning("d");
      assert.deepEqual(inMemoryLogger.allLogs, ["##[error]a", "b", "##[section]c", "##[warning]d"]);
      assert.deepEqual(inMemoryLogger.errorLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.infoLogs, ["b"]);
      assert.deepEqual(inMemoryLogger.sectionLogs, ["##[section]c"]);
      assert.deepEqual(inMemoryLogger.warningLogs, ["##[warning]d"]);
      assert.deepEqual(inMemoryLogger.verboseLogs, []);

      await logger.logVerbose("e");
      assert.deepEqual(inMemoryLogger.allLogs, ["##[error]a", "b", "##[section]c", "##[warning]d", "e"]);
      assert.deepEqual(inMemoryLogger.errorLogs, ["##[error]a"]);
      assert.deepEqual(inMemoryLogger.infoLogs, ["b"]);
      assert.deepEqual(inMemoryLogger.sectionLogs, ["##[section]c"]);
      assert.deepEqual(inMemoryLogger.warningLogs, ["##[warning]d"]);
      assert.deepEqual(inMemoryLogger.verboseLogs, ["e"]);
    });
  });

  describe("InMemoryLogger", function () {
    it("getInMemoryLogger()", function () {
      const logger: InMemoryLogger = getInMemoryLogger();
      assert.deepEqual(logger.allLogs, []);
      assert.deepEqual(logger.infoLogs, []);
      assert.deepEqual(logger.errorLogs, []);
    });

    it("logInfo()", async function () {
      const logger: InMemoryLogger = getInMemoryLogger();
      await logger.logInfo("apples");
      assert.deepEqual(logger.allLogs, ["apples"]);
      assert.deepEqual(logger.infoLogs, ["apples"]);
      assert.deepEqual(logger.errorLogs, []);
    });

    it("logError()", async function () {
      const logger: InMemoryLogger = getInMemoryLogger();
      await logger.logError("bananas");
      assert.deepEqual(logger.allLogs, ["bananas"]);
      assert.deepEqual(logger.infoLogs, []);
      assert.deepEqual(logger.errorLogs, ["bananas"]);
    });
  });

  describe("wrapLogger()", function () {
    it("with overridden logInfo()", async function () {
      const logger: InMemoryLogger = getInMemoryLogger();
      const wrappedLogger: Logger = wrapLogger(logger, {
        logInfo: (text: string) => logger.logInfo(`[INFO] ${text}`)
      });

      await wrappedLogger.logInfo("abc");
      assert.deepEqual(logger.allLogs, ["[INFO] abc"]);
      assert.deepEqual(logger.infoLogs, ["[INFO] abc"]);
      assert.deepEqual(logger.errorLogs, []);

      await wrappedLogger.logError("xyz");
      assert.deepEqual(logger.allLogs, ["[INFO] abc", "xyz"]);
      assert.deepEqual(logger.infoLogs, ["[INFO] abc"]);
      assert.deepEqual(logger.errorLogs, ["xyz"]);
    });

    it("with overridden logError()", async function () {
      const logger: InMemoryLogger = getInMemoryLogger();
      const wrappedLogger: Logger = wrapLogger(logger, {
        logError: (text: string) => logger.logError(`[ERROR] ${text}`)
      });

      await wrappedLogger.logInfo("abc");
      assert.deepEqual(logger.allLogs, ["abc"]);
      assert.deepEqual(logger.infoLogs, ["abc"]);
      assert.deepEqual(logger.errorLogs, []);

      await wrappedLogger.logError("xyz");
      assert.deepEqual(logger.allLogs, ["abc", "[ERROR] xyz"]);
      assert.deepEqual(logger.infoLogs, ["abc"]);
      assert.deepEqual(logger.errorLogs, ["[ERROR] xyz"]);
    });
  });
});
