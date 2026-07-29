// Auth-method segmented choice + show_when field visibility (Bedrock's "Connect with"):
// only the selected method's fields render, and clicking a segment switches them.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  OLLAMA_DOWNLOAD_URL,
  OLLAMA_RECOMMENDED_COMMAND,
  OLLAMA_STARTER_COMMAND,
  ProviderForm,
  type ProviderSetupState,
} from "./ProviderSetup";
import type { ProviderInfo } from "../api";
import { openExternal } from "../tauri";

vi.mock("../tauri", () => ({ openExternal: vi.fn() }));

afterEach(cleanup);

const BEDROCK: ProviderInfo = {
  name: "bedrock",
  title: "AWS Bedrock",
  needs_key: true,
  configured: false,
  values: {},
  suggested_models: [],
  recommended_model: null,
  fields: [
    { key: "region", label: "AWS region", secret: false, required: true, help: "", placeholder: "us-east-1" },
    {
      key: "auth_method",
      label: "Connect with",
      secret: false,
      required: false,
      help: "",
      placeholder: "",
      default: "api_key",
      choices: [
        { value: "api_key", label: "Bedrock API key" },
        { value: "profile", label: "AWS profile" },
        { value: "iam", label: "IAM keys" },
      ],
    },
    { key: "bedrock_api_key", label: "Bedrock API key", secret: true, required: false, help: "", placeholder: "ABSK…", show_when: { auth_method: "api_key" } },
    { key: "aws_profile", label: "AWS profile", secret: false, required: false, help: "", placeholder: "default", show_when: { auth_method: "profile" } },
    { key: "aws_secret_access_key", label: "Secret access key", secret: true, required: false, help: "", placeholder: "", show_when: { auth_method: "iam" } },
  ],
};

const OLLAMA: ProviderInfo = {
  name: "ollama",
  title: "Ollama (local models)",
  needs_key: false,
  configured: true,
  values: {},
  suggested_models: [],
  recommended_model: "qwen3-coder:30b",
  fields: [
    {
      key: "base_url",
      label: "Ollama server URL",
      secret: false,
      required: false,
      help: "The OpenAI-compatible /v1 path is added automatically.",
      placeholder: "http://localhost:11434",
      default: "http://localhost:11434",
    },
  ],
};

function makePs(
  fields: Record<string, string>,
  setFieldValue = vi.fn(),
  provider: ProviderInfo = BEDROCK,
): ProviderSetupState {
  return {
    providers: [provider],
    ordered: [provider],
    refreshProviders: async () => {},
    sel: provider.name,
    info: provider,
    fields,
    setFieldValue,
    dirty: false,
    verify: { state: "idle" },
    showEndpoint: false,
    setShowEndpoint: () => {},
    keylessOk: new Set(),
    credentialed: false,
    savedState: false,
    secretFilled: true,
    openProvider: () => {},
    backToGallery: () => {},
    runTestAndSave: async () => true,
    removeKey: async () => {},
    cancelBackTimer: () => {},
    statusFor: () => null,
    saveField: async () => {},
    fieldSaved: null,
  };
}

describe("ProviderForm auth-method choice", () => {
  it("renders only the selected method's fields", () => {
    render(<ProviderForm ps={makePs({ auth_method: "api_key" })} tp="t" />);
    expect(screen.getByTestId("t-field-bedrock_api_key")).toBeTruthy();
    expect(screen.queryByTestId("t-field-aws_profile")).toBeNull();
    expect(screen.queryByTestId("t-field-aws_secret_access_key")).toBeNull();
    expect(screen.getByTestId("t-choice-auth_method-api_key").getAttribute("aria-checked")).toBe("true");
  });

  it("switching the segment swaps the visible fields", () => {
    const setFieldValue = vi.fn();
    const { rerender } = render(
      <ProviderForm ps={makePs({ auth_method: "api_key" }, setFieldValue)} tp="t" />,
    );
    fireEvent.click(screen.getByTestId("t-choice-auth_method-profile"));
    expect(setFieldValue).toHaveBeenCalledWith("auth_method", "profile");
    rerender(<ProviderForm ps={makePs({ auth_method: "profile" }, setFieldValue)} tp="t" />);
    expect(screen.getByTestId("t-field-aws_profile")).toBeTruthy();
    expect(screen.queryByTestId("t-field-bedrock_api_key")).toBeNull();
  });

  it("iam segment shows the key-pair fields", () => {
    render(<ProviderForm ps={makePs({ auth_method: "iam" })} tp="t" />);
    expect(screen.getByTestId("t-field-aws_secret_access_key")).toBeTruthy();
    expect(screen.queryByTestId("t-field-bedrock_api_key")).toBeNull();
  });
});

describe("ProviderForm Ollama setup guide", () => {
  it("teaches local installation, model download, and detection", () => {
    render(
      <ProviderForm
        ps={makePs({ base_url: "http://localhost:11434" }, vi.fn(), OLLAMA)}
        tp="t"
      />,
    );

    expect(screen.getByTestId("t-ollama-guide")).toBeTruthy();
    expect(screen.getByText("OllamaSetup.exe")).toBeTruthy();
    expect(screen.getByText(OLLAMA_STARTER_COMMAND)).toBeTruthy();
    expect(screen.getByText(OLLAMA_RECOMMENDED_COMMAND)).toBeTruthy();
    expect(screen.getByText(/then click/).textContent).toContain("Detect");
    expect(screen.queryByText(/this Mac/)).toBeNull();
  });

  it("opens the official Windows download and copies both model commands", () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(
      <ProviderForm
        ps={makePs({ base_url: "http://localhost:11434" }, vi.fn(), OLLAMA)}
        tp="t"
      />,
    );

    fireEvent.click(screen.getByTestId("t-ollama-download"));
    expect(openExternal).toHaveBeenCalledWith(OLLAMA_DOWNLOAD_URL);

    fireEvent.click(screen.getByTestId("t-ollama-copy-starter"));
    fireEvent.click(screen.getByTestId("t-ollama-copy-recommended"));
    expect(writeText).toHaveBeenNthCalledWith(1, OLLAMA_STARTER_COMMAND);
    expect(writeText).toHaveBeenNthCalledWith(2, OLLAMA_RECOMMENDED_COMMAND);
  });

  it("does not show the Ollama guide for a keyed provider", () => {
    render(<ProviderForm ps={makePs({ auth_method: "api_key" })} tp="t" />);
    expect(screen.queryByTestId("t-ollama-guide")).toBeNull();
  });
});
