import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Prevent DOM state leaking between role/access and focus tests.
afterEach(() => cleanup());
