import { Temporal } from "@js-temporal/polyfill";
import { diff, diffWith, patch } from "./utils";

const {
  PlainDate,
  PlainTime,
  PlainDateTime,
  Instant,
  ZonedDateTime,
  PlainYearMonth,
  PlainMonthDay,
  Duration,
} = Temporal;

describe("Temporal", () => {
  test("equal values produce no diff", () => {
    expect(diff(PlainDate.from("2020-01-01"), PlainDate.from("2020-01-01"))).toEqual([]);
    // "12:30" and "12:30:00" normalise to the same PlainTime
    expect(diff(PlainTime.from("12:30"), PlainTime.from("12:30:00"))).toEqual([]);
    expect(diff(PlainDateTime.from("2020-01-01T12:30"), PlainDateTime.from("2020-01-01T12:30"))).toEqual([]);
    expect(diff(Instant.from("2020-01-01T00:00Z"), Instant.from("2020-01-01T00:00:00Z"))).toEqual([]);
    expect(diff(PlainYearMonth.from("2020-01"), PlainYearMonth.from("2020-01"))).toEqual([]);
    expect(diff(PlainMonthDay.from("01-15"), PlainMonthDay.from("01-15"))).toEqual([]);
    expect(diff(Duration.from({ hours: 2 }), Duration.from({ hours: 2 }))).toEqual([]);
    // nested
    expect(diff({ d: PlainDate.from("2020-01-01") }, { d: PlainDate.from("2020-01-01") })).toEqual([]);
  });

  test("different values -> single CHANGED carrying the new value", () => {
    const b = PlainDate.from("2021-06-15");
    const d = diff(PlainDate.from("2020-01-01"), b);
    expect(d.length).toBe(1);
    expect(d[0].type).toBe(2);
    expect(d[0].path).toEqual([]);
    expect((d[0].value as Temporal.PlainDate).equals(b)).toBe(true);
  });

  test("Duration compares structurally, not by elapsed time", () => {
    // 2h and 120m are the same length of time but different Duration values,
    // so a faithful diff records the change (patch must reproduce the exact one).
    const d = diff({ x: Duration.from({ hours: 2 }) }, { x: Duration.from({ minutes: 120 }) });
    expect(d.length).toBe(1);
    expect(d[0].type).toBe(2);
    expect((d[0].value as Temporal.Duration).toString()).toBe("PT120M");
  });

  test("different Temporal types -> CHANGED", () => {
    const d = diff({ x: PlainDate.from("2020-01-01") }, { x: PlainTime.from("12:00") });
    expect(d.length).toBe(1);
    expect(d[0].type).toBe(2);
  });

  test("Temporal vs a non-Temporal value -> CHANGED", () => {
    const d = diff({ x: PlainDate.from("2020-01-01") }, { x: { year: 2020 } });
    expect(d.length).toBe(1);
    expect(d[0].type).toBe(2);
  });

  test("round-trips through patch", () => {
    const a = {
      when: ZonedDateTime.from("2020-01-01T00:00[UTC]"),
      dur: Duration.from({ minutes: 90 }),
    };
    const b = {
      when: ZonedDateTime.from("2021-06-15T08:30[America/New_York]"),
      dur: Duration.from({ hours: 1, minutes: 30 }),
    };
    const patched = patch(a, diff(a, b));
    expect((patched.when as Temporal.ZonedDateTime).equals(b.when)).toBe(true);
    expect((patched.dur as Temporal.Duration).toString()).toBe(b.dur.toString());
    expect(diff(patched, b)).toEqual([]);
  });

  test("nested inside arrays and Maps", () => {
    const a = {
      list: [PlainDate.from("2020-01-01")],
      m: new Map([["k", Instant.from("2020-01-01T00:00Z")]]),
    };
    const b = {
      list: [PlainDate.from("2020-01-02")],
      m: new Map([["k", Instant.from("2020-01-01T00:00Z")]]),
    };
    const d = diff(a, b);
    expect(d.length).toBe(1);
    expect(d[0].path).toEqual(["list", 0]);
    expect((d[0].value as Temporal.PlainDate).equals(b.list[0])).toBe(true);
  });

  test("diffWith comparator still overrides Temporal", () => {
    const a = PlainDate.from("2020-01-01");
    const b = PlainDate.from("2021-01-01");
    // force-equal
    expect(diffWith(a, b, () => false)).toEqual([]);
    // force-changed
    const forced = diffWith(a, b, () => true);
    expect(forced.length).toBe(1);
    expect(forced[0].type).toBe(2);
  });
});
