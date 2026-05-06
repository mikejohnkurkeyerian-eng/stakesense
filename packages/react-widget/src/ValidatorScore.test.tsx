/// <reference types="vitest" />
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ValidatorScore } from "./ValidatorScore.js";

const VALIDATOR_DETAIL = {
  validator: {
    vote_pubkey: "AbCdEf12345678901234567890123456789012345",
    name: "Test Validator",
    composite_score: 0.85,
    downtime_prob_7d: 0.05,
    mev_tax_rate: 0.04,
    decentralization_score: 0.75,
    data_center: "DC-A",
    country: "US",
  },
};

describe("ValidatorScore", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALIDATOR_DETAIL,
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders validator name + scores after fetch", async () => {
    render(<ValidatorScore votePubkey="AbCdEf12345678901234567890123456789012345" />);
    await waitFor(() => screen.getByText("Test Validator"));
    expect(screen.getByText("0.850")).toBeTruthy();
    expect(screen.getByText("5.0%")).toBeTruthy();
  });

  it("calls the configured apiBase", async () => {
    const f = global.fetch as ReturnType<typeof vi.fn>;
    render(
      <ValidatorScore
        votePubkey="abc"
        apiBase="https://custom.example/api"
      />,
    );
    await waitFor(() =>
      expect(f).toHaveBeenCalledWith(
        expect.stringContaining("https://custom.example/api"),
      ),
    );
  });
});
