import { describe, expect, test } from "vitest";
import {
  ValidationError,
  encodeCursor,
  parseCursor,
  parseLimit,
  parseModerationAction,
  parsePlaceId,
  parseReportDetails,
  parseReportReason,
  parseReviewId,
} from "./validation.js";

const ID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

test("parsePlaceId accepts Google Place IDs and rejects anything else", () => {
  expect(parsePlaceId(" ChIJN1t_tDeuEmsRUsoyG83frY4 ")).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
  for (const bad of ["", "a/b", "a b", "x".repeat(513), 42, undefined]) {
    expect(() => parsePlaceId(bad), String(bad)).toThrow(ValidationError);
  }
});

describe("cursors", () => {
  test("round-trip with full timestamp precision", () => {
    const cursor = { ts: "2026-11-04T10:00:00.123456Z", id: ID };
    expect(parseCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  test("absent cursor means the first page", () => {
    expect(parseCursor(undefined)).toBeNull();
    expect(parseCursor("")).toBeNull();
  });

  test.each([
    ["not base64 json", "%%%"],
    ["not an array", b64({ ts: "2026-01-01", id: ID })],
    ["wrong length", b64(["2026-01-01"])],
    ["bad date", b64(["yesterday", ID])],
    ["bad uuid", b64(["2026-01-01", "1; DROP TABLE"])],
    ["too long", "a".repeat(201)],
    ["not a string", ["x"]],
  ])("rejects %s", (_label, value) => {
    expect(() => parseCursor(value)).toThrow(ValidationError);
  });
});

test("parseLimit defaults, caps and rejects junk", () => {
  expect(parseLimit(undefined)).toBe(10);
  expect(parseLimit("5")).toBe(5);
  expect(parseLimit("500")).toBe(50);
  expect(parseLimit("500", 50, 100)).toBe(100);
  for (const bad of ["0", "-1", "2.5", "ten", ["5"]]) {
    expect(() => parseLimit(bad), String(bad)).toThrow(ValidationError);
  }
});

test("parseReviewId accepts UUIDs only and normalises case", () => {
  expect(parseReviewId(ID.toUpperCase())).toBe(ID);
  expect(() => parseReviewId("123")).toThrow(ValidationError);
});

test("report reasons, details and moderation actions are whitelisted", () => {
  expect(parseReportReason("spam")).toBe("spam");
  expect(() => parseReportReason("boring")).toThrow(ValidationError);

  expect(parseReportDetails("  rude  ")).toBe("rude");
  expect(parseReportDetails("   ")).toBeNull();
  expect(parseReportDetails(undefined)).toBeNull();
  expect(() => parseReportDetails("x".repeat(501))).toThrow(ValidationError);
  expect(() => parseReportDetails(5)).toThrow(ValidationError);

  expect(parseModerationAction("unhide")).toBe("unhide");
  expect(() => parseModerationAction("delete")).toThrow(ValidationError);
});
