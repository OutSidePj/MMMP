import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const response = {
  id: "test-generation",
  status: "completed",
  audioUrl: "/outputs/sample.wav",
  metadata: { bpm: 150, duration: 20, genre: "Electronic", mood: "Energetic" },
};

describe("music generator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("accepts prompt and control changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    const prompt = screen.getByTestId("music-prompt");
    await user.clear(prompt);
    await user.type(prompt, "dreamy ambient piano");
    expect(prompt).toHaveValue("dreamy ambient piano");

    fireEvent.change(screen.getByTestId("bpm-slider"), { target: { value: "150" } });
    fireEvent.change(screen.getByTestId("duration-slider"), { target: { value: "30" } });
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("30 sec")).toBeInTheDocument();
  });

  it("shows loading and a playable result", async () => {
    render(<App />);
    fireEvent.change(screen.getByTestId("bpm-slider"), { target: { value: "150" } });
    fireEvent.click(screen.getByTestId("generate-button"));
    expect(screen.getByTestId("generation-loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("generated-track")).toBeInTheDocument());
    expect(screen.getByTestId("audio-player")).toHaveAttribute("src", "/outputs/sample.wav");
    expect(screen.getByTestId("download-button")).toBeInTheDocument();
  });
});

