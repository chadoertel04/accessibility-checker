import { describe, expect, test } from "vitest";
import {
  applyCommunityStatus,
  getCommunityNote,
  getCommunityVerdict,
} from "./communityStatus";

const votes = (likes: number, dislikes: number) => ({ likes, dislikes });

describe("getCommunityVerdict", () => {
  test.each([
    [votes(0, 0), null],
    [votes(1, 0), null], // one vote must not decide for everyone
    [votes(2, 0), null],
    [votes(2, 1), "available"], // exactly two thirds
    [votes(3, 0), "available"],
    [votes(0, 3), "unavailable"],
    [votes(2, 2), null],
    [votes(4, 2), "available"],
    [votes(2, 4), "unavailable"],
    [votes(5, 3), null], // 62.5%: a majority, but not a clear one
  ])("%o -> %s", (summary, expected) => {
    expect(getCommunityVerdict(summary)).toBe(expected);
  });

  test("no summary means no verdict", () => {
    expect(getCommunityVerdict(undefined)).toBeNull();
  });
});

describe("applyCommunityStatus", () => {
  test("only fills in unknown features", () => {
    expect(applyCommunityStatus({ status: "unknown" }, votes(3, 0)).status).toBe("available");
    expect(applyCommunityStatus({ status: "unavailable" }, votes(3, 0)).status).toBe("unavailable");
    expect(applyCommunityStatus({ status: "unknown" }, votes(1, 0)).status).toBe("unknown");
  });
});

describe("getCommunityNote", () => {
  test("describes each state", () => {
    expect(getCommunityNote("unknown", votes(0, 0))).toBeUndefined();
    expect(getCommunityNote("unknown", votes(1, 0))).toBe("1 visitor report so far, 3 needed to confirm");
    expect(getCommunityNote("unknown", votes(1, 1))).toBe("2 visitor reports so far, 3 needed to confirm");
    expect(getCommunityNote("unknown", votes(4, 1))).toBe("Reported as accessible by 4 of 5 visitors");
    expect(getCommunityNote("unknown", votes(0, 3))).toBe("Reported as not accessible by 3 of 3 visitors");
    expect(getCommunityNote("unknown", votes(2, 2))).toBe("Visitor reports are split on this feature");
  });

  test("stays silent when map data already decided", () => {
    expect(getCommunityNote("available", votes(0, 5))).toBeUndefined();
  });
});
