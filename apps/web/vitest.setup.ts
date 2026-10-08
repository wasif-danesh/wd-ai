process.env.AUTH_MODE = "stub"; // tests run without sign-in unless a test turns it on
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
