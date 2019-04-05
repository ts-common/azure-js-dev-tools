/**
 * The different type of duration units.
 */
export type DurationUnits = "Milliseconds" | "Seconds" | "Minutes" | "Hours" | "Days" | "Weeks";

const weeksToDays = 7;
const daysToHours = 24;
const hoursToMinutes = 60;
const minutesToSeconds = 60;
const secondsToMilliseconds = 1000;

const weeksToHours: number = weeksToDays * daysToHours;
const weeksToMinutes: number = weeksToHours * hoursToMinutes;
const weeksToSeconds: number = weeksToMinutes * minutesToSeconds;
const weeksToMilliseconds: number = weeksToSeconds * secondsToMilliseconds;

const daysToWeeks: number = 1 / weeksToDays;
const daysToMinutes: number = daysToHours * hoursToMinutes;
const daysToSeconds: number = daysToMinutes * minutesToSeconds;
const daysToMilliseconds: number = daysToSeconds * secondsToMilliseconds;

const hoursToWeeks: number = 1 / weeksToHours;
const hoursToDays: number = 1 / daysToHours;
const hoursToSeconds: number = hoursToMinutes * minutesToSeconds;
const hoursToMilliseconds: number = hoursToSeconds * secondsToMilliseconds;

const minutesToWeeks: number = 1 / weeksToMinutes;
const minutesToDays: number = 1 / daysToMinutes;
const minutesToHours: number = 1 / hoursToMinutes;
const minutesToMilliseconds: number = minutesToSeconds * secondsToMilliseconds;

const secondsToWeeks: number = 1 / weeksToSeconds;
const secondsToDays: number = 1 / daysToSeconds;
const secondsToHours: number = 1 / hoursToSeconds;
const secondsToMinutes: number = 1 / minutesToSeconds;

const millisecondsToWeeks: number = 1 / weeksToMilliseconds;
const millisecondsToDays: number = 1 / daysToMilliseconds;
const millisecondsToHours: number = 1 / hoursToMilliseconds;
const millisecondsToMinutes: number = 1 / minutesToMilliseconds;
const millisecondsToSeconds: number = 1 / secondsToMilliseconds;

/**
 * A class that represents a duration of time.
 */
export class Duration {
  /**
   * Create a new Duration for the provided amount of milliseconds.
   * @param value The numeric value of the Duration.
   * @param units The units of the value for the Duration.
   */
  constructor(public readonly value: number, public readonly units: DurationUnits) {
  }

  /**
   * Create a new Duration object with the provided number of milliseconds.
   * @param value The number of milliseconds in the Duration.
   */
  public static milliseconds(value: number): Duration {
    return new Duration(value, "Milliseconds");
  }

  /**
   * Create a new Duration object with the provided number of seconds.
   * @param value The number of seconds in the Duration.
   */
  public static seconds(value: number): Duration {
    return new Duration(value, "Seconds");
  }

  /**
   * Create a new Duration object with the provided number of minutes.
   * @param value The number of minutes in the Duration.
   */
  public static minutes(value: number): Duration {
    return new Duration(value, "Minutes");
  }

  /**
   * Create a new Duration object with the provided number of hours.
   * @param value The number of hours in the Duration.
   */
  public static hours(value: number): Duration {
    return new Duration(value, "Hours");
  }

  /**
   * Create a new Duration object with the provided number of days.
   * @param value The number of days in the Duration.
   */
  public static days(value: number): Duration {
    return new Duration(value, "Days");
  }

  /**
   * Create a new Duration object with the provided number of weeks.
   * @param value The number of weeks in the Duration.
   */
  public static weeks(value: number): Duration {
    return new Duration(value, "Weeks");
  }

  /**
   * Convert this Duration to the provided DurationUnits.
   */
  public convertTo(targetUnits: DurationUnits): Duration {
    let result: Duration = this;
    switch (this.units) {
      case "Milliseconds":
        switch (targetUnits) {
          case "Seconds":
            result = new Duration(this.value * millisecondsToSeconds, targetUnits);
            break;

          case "Minutes":
            result = new Duration(this.value * millisecondsToMinutes, targetUnits);
            break;

          case "Hours":
            result = new Duration(this.value * millisecondsToHours, targetUnits);
            break;

          case "Days":
            result = new Duration(this.value * millisecondsToDays, targetUnits);
            break;

          case "Weeks":
            result = new Duration(this.value * millisecondsToWeeks, targetUnits);
            break;
        }
        break;

      case "Seconds":
        switch (targetUnits) {
          case "Milliseconds":
            result = new Duration(this.value * secondsToMilliseconds, targetUnits);
            break;

          case "Minutes":
            result = new Duration(this.value * secondsToMinutes, targetUnits);
            break;

          case "Hours":
            result = new Duration(this.value * secondsToHours, targetUnits);
            break;

          case "Days":
            result = new Duration(this.value * secondsToDays, targetUnits);
            break;

          case "Weeks":
            result = new Duration(this.value * secondsToWeeks, targetUnits);
            break;
        }
        break;

      case "Minutes":
        switch (targetUnits) {
          case "Milliseconds":
            result = new Duration(this.value * minutesToMilliseconds, targetUnits);
            break;

          case "Seconds":
            result = new Duration(this.value * minutesToSeconds, targetUnits);
            break;

          case "Hours":
            result = new Duration(this.value * minutesToHours, targetUnits);
            break;

          case "Days":
            result = new Duration(this.value * minutesToDays, targetUnits);
            break;

          case "Weeks":
            result = new Duration(this.value * minutesToWeeks, targetUnits);
            break;
        }
        break;

      case "Hours":
        switch (targetUnits) {
          case "Milliseconds":
            result = new Duration(this.value * hoursToMilliseconds, targetUnits);
            break;

          case "Seconds":
            result = new Duration(this.value * hoursToSeconds, targetUnits);
            break;

          case "Minutes":
            result = new Duration(this.value * hoursToMinutes, targetUnits);
            break;

          case "Days":
            result = new Duration(this.value * hoursToDays, targetUnits);
            break;

          case "Weeks":
            result = new Duration(this.value * hoursToWeeks, targetUnits);
            break;
        }
        break;

      case "Days":
        switch (targetUnits) {
          case "Milliseconds":
            result = new Duration(this.value * daysToMilliseconds, targetUnits);
            break;

          case "Seconds":
            result = new Duration(this.value * daysToSeconds, targetUnits);
            break;

          case "Minutes":
            result = new Duration(this.value * daysToMinutes, targetUnits);
            break;

          case "Hours":
            result = new Duration(this.value * daysToHours, targetUnits);
            break;

          case "Weeks":
            result = new Duration(this.value * daysToWeeks, targetUnits);
            break;
        }
        break;

      case "Weeks":
        switch (targetUnits) {
          case "Milliseconds":
            result = new Duration(this.value * weeksToMilliseconds, targetUnits);
            break;

          case "Seconds":
            result = new Duration(this.value * weeksToSeconds, targetUnits);
            break;

          case "Minutes":
            result = new Duration(this.value * weeksToMinutes, targetUnits);
            break;

          case "Hours":
            result = new Duration(this.value * weeksToHours, targetUnits);
            break;

          case "Days":
            result = new Duration(this.value * weeksToDays, targetUnits);
            break;
        }
        break;
    }
    return result;
  }

  /**
   * Convert this Duration to milliseconds.
   */
  public toMilliseconds(): Duration {
    return this.convertTo("Milliseconds");
  }

  /**
   * Convert this Duration to seconds.
   */
  public toSeconds(): Duration {
    return this.convertTo("Seconds");
  }

  /**
   * Convert this Duration to minutes.
   */
  public toMinutes(): Duration {
    return this.convertTo("Minutes");
  }

  /**
   * Convert this Duration to hours.
   */
  public toHours(): Duration {
    return this.convertTo("Hours");
  }

  /**
   * Convert this Duration to days.
   */
  public toDays(): Duration {
    return this.convertTo("Days");
  }

  /**
   * Convert this Duration to weeks.
   */
  public toWeeks(): Duration {
    return this.convertTo("Weeks");
  }

  /**
   * Get the string representation of this Duration.
   */
  public toString(): string {
    return `${this.value} ${this.units}`;
  }
}
