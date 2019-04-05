import { assert } from "chai";
import { Duration } from "../lib/duration";

describe("duration.ts", function () {
  describe("Duration", function () {
    it("constructor", function () {
      const duration = new Duration(5, "Seconds");
      assert.strictEqual(duration.value, 5);
      assert.strictEqual(duration.units, "Seconds");
      assert.strictEqual(duration.toString(), "5 Seconds");
    });

    it("milliseconds()", function () {
      const duration: Duration = Duration.milliseconds(6);
      assert.strictEqual(duration.value, 6);
      assert.strictEqual(duration.units, "Milliseconds");
      assert.strictEqual(duration.toString(), "6 Milliseconds");
    });

    it("seconds()", function () {
      const duration: Duration = Duration.seconds(7);
      assert.strictEqual(duration.value, 7);
      assert.strictEqual(duration.units, "Seconds");
      assert.strictEqual(duration.toString(), "7 Seconds");
    });

    it("minutes()", function () {
      const duration: Duration = Duration.minutes(8);
      assert.strictEqual(duration.value, 8);
      assert.strictEqual(duration.units, "Minutes");
      assert.strictEqual(duration.toString(), "8 Minutes");
    });

    it("hours()", function () {
      const duration: Duration = Duration.hours(9);
      assert.strictEqual(duration.value, 9);
      assert.strictEqual(duration.units, "Hours");
      assert.strictEqual(duration.toString(), "9 Hours");
    });

    it("days()", function () {
      const duration: Duration = Duration.days(10);
      assert.strictEqual(duration.value, 10);
      assert.strictEqual(duration.units, "Days");
      assert.strictEqual(duration.toString(), "10 Days");
    });

    it("weeks()", function () {
      const duration: Duration = Duration.weeks(11);
      assert.strictEqual(duration.value, 11);
      assert.strictEqual(duration.units, "Weeks");
      assert.strictEqual(duration.toString(), "11 Weeks");
    });

    describe("toMilliseconds()", function () {
      it("from 1 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(1);
        assert.strictEqual(duration.toMilliseconds(), duration);
      });

      it("from 2 Seconds", function () {
        const duration: Duration = Duration.seconds(2);
        assert.deepEqual(duration.toMilliseconds(), Duration.milliseconds(2000));
      });

      it("from 3 Minutes", function () {
        const duration: Duration = Duration.minutes(3);
        assert.deepEqual(duration.toMilliseconds(), Duration.milliseconds(180000));
      });

      it("from 4 Hours", function () {
        const duration: Duration = Duration.hours(4);
        assert.deepEqual(duration.toMilliseconds(), Duration.milliseconds(14400000));
      });

      it("from 5 Days", function () {
        const duration: Duration = Duration.days(5);
        assert.deepEqual(duration.toMilliseconds(), Duration.milliseconds(432000000));
      });

      it("from 6 Weeks", function () {
        const duration: Duration = Duration.weeks(6);
        assert.deepEqual(duration.toMilliseconds(), Duration.milliseconds(3628800000));
      });
    });

    describe("toSeconds()", function () {
      it("from 7 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(7);
        assert.deepEqual(duration.toSeconds(), Duration.seconds(0.007));
      });

      it("from 8 Seconds", function () {
        const duration: Duration = Duration.seconds(8);
        assert.strictEqual(duration.toSeconds(), duration);
      });

      it("from 9 Minutes", function () {
        const duration: Duration = Duration.minutes(9);
        assert.deepEqual(duration.toSeconds(), Duration.seconds(540));
      });

      it("from 10 Hours", function () {
        const duration: Duration = Duration.hours(10);
        assert.deepEqual(duration.toSeconds(), Duration.seconds(36000));
      });

      it("from 11 Days", function () {
        const duration: Duration = Duration.days(11);
        assert.deepEqual(duration.toSeconds(), Duration.seconds(950400));
      });

      it("from 12 Weeks", function () {
        const duration: Duration = Duration.weeks(12);
        assert.deepEqual(duration.toSeconds(), Duration.seconds(7257600));
      });
    });

    describe("toMinutes()", function () {
      it("from 13 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(13);
        assert.deepEqual(duration.toMinutes(), Duration.minutes(0.00021666666666666668));
      });

      it("from 14 Seconds", function () {
        const duration: Duration = Duration.seconds(14);
        assert.deepEqual(duration.toMinutes(), Duration.minutes(0.23333333333333334));
      });

      it("from 15 Minutes", function () {
        const duration: Duration = Duration.minutes(15);
        assert.strictEqual(duration.toMinutes(), duration);
      });

      it("from 16 Hours", function () {
        const duration: Duration = Duration.hours(16);
        assert.deepEqual(duration.toMinutes(), Duration.minutes(960));
      });

      it("from 17 Days", function () {
        const duration: Duration = Duration.days(17);
        assert.deepEqual(duration.toMinutes(), Duration.minutes(24480));
      });

      it("from 18 Weeks", function () {
        const duration: Duration = Duration.weeks(18);
        assert.deepEqual(duration.toMinutes(), Duration.minutes(181440));
      });
    });

    describe("toHours()", function () {
      it("from 19 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(19);
        assert.deepEqual(duration.toHours(), Duration.hours(0.000005277777777777778));
      });

      it("from 20 Seconds", function () {
        const duration: Duration = Duration.seconds(20);
        assert.deepEqual(duration.toHours(), Duration.hours(0.005555555555555556));
      });

      it("from 21 Minutes", function () {
        const duration: Duration = Duration.minutes(21);
        assert.deepEqual(duration.toHours(), Duration.hours(0.35));
      });

      it("from 22 Hours", function () {
        const duration: Duration = Duration.hours(22);
        assert.strictEqual(duration.toHours(), duration);
      });

      it("from 23 Days", function () {
        const duration: Duration = Duration.days(23);
        assert.deepEqual(duration.toHours(), Duration.hours(552));
      });

      it("from 24 Weeks", function () {
        const duration: Duration = Duration.weeks(24);
        assert.deepEqual(duration.toHours(), Duration.hours(4032));
      });
    });

    describe("toDays()", function () {
      it("from 25 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(25);
        assert.deepEqual(duration.toDays(), Duration.days(2.8935185185185185e-7));
      });

      it("from 26 Seconds", function () {
        const duration: Duration = Duration.seconds(26);
        assert.deepEqual(duration.toDays(), Duration.days(0.0003009259259259259));
      });

      it("from 27 Minutes", function () {
        const duration: Duration = Duration.minutes(27);
        assert.deepEqual(duration.toDays(), Duration.days(0.01875));
      });

      it("from 28 Hours", function () {
        const duration: Duration = Duration.hours(28);
        assert.deepEqual(duration.toDays(), Duration.days(1.1666666666666665));
      });

      it("from 29 Days", function () {
        const duration: Duration = Duration.days(29);
        assert.strictEqual(duration.toDays(), duration);
      });

      it("from 30 Weeks", function () {
        const duration: Duration = Duration.weeks(30);
        assert.deepEqual(duration.toDays(), Duration.days(210));
      });
    });

    describe("toWeeks()", function () {
      it("from 31 Milliseconds", function () {
        const duration: Duration = Duration.milliseconds(31);
        assert.deepEqual(duration.toWeeks(), Duration.weeks(5.125661375661376e-8));
      });

      it("from 32 Seconds", function () {
        const duration: Duration = Duration.seconds(32);
        assert.deepEqual(duration.toWeeks(), Duration.weeks(0.00005291005291005291));
      });

      it("from 33 Minutes", function () {
        const duration: Duration = Duration.minutes(33);
        assert.deepEqual(duration.toWeeks(), Duration.weeks(0.003273809523809524));
      });

      it("from 34 Hours", function () {
        const duration: Duration = Duration.hours(34);
        assert.deepEqual(duration.toWeeks(), Duration.weeks(0.20238095238095238));
      });

      it("from 35 Days", function () {
        const duration: Duration = Duration.days(35);
        assert.deepEqual(duration.toWeeks(), Duration.weeks(5));
      });

      it("from 36 Weeks", function () {
        const duration: Duration = Duration.weeks(36);
        assert.strictEqual(duration.toWeeks(), duration);
      });
    });
  });
});
