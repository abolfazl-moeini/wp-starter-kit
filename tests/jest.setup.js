import { jest } from "@jest/globals";

jest.mock("@core/utils", () => {
  const rootDir = process.cwd();
  const REQUIRED_FIELDS = [
    "slug",
    "globalName",
    "localizeVar",
    "textDomain",
    "hookPrefix",
    "npmScope",
  ];

  return {
    getMetaUrl: jest.fn(() => rootDir + "/core/packages/utils/path.js"),
    getRootPath: jest.fn(() => rootDir),
    getOrgName: jest.fn(() => "Testing"),
    getOrgNameSync: jest.fn(() => "Testing"),
    dirname: jest.fn(() => "/mock/dirname"),
    readProjectConfig: ({ path: customPath } = {}) => {
      const { existsSync, readFileSync } = require("node:fs");
      const { resolve } = require("node:path");
      const configPath = customPath || resolve(rootDir, "project.config.json");
      if (!existsSync(configPath)) {
        throw new Error("project.config.json not found at: " + configPath);
      }
      try {
        const raw = readFileSync(configPath, "utf8");
        const config = JSON.parse(raw);
        const missing = REQUIRED_FIELDS.filter((f) => !config[f]);
        if (missing.length > 0) {
          throw new Error(
            "project.config.json is missing required fields: " +
              missing.join(", "),
          );
        }
        const defaults = {
          depsBundle: `${config.slug}-deps.js`,
          phpFunctionPrefix: "wpsk_",
          uiFramework: "preact",
          restNamespace: "wpsk/v1",
          vendorPrefix: "WpskVendor",
          phpMinVersion: "7.4",
          phpSourceVersion: "8.1",
          batchEndpoint: "/batch/v1",
        };
        const merged = { ...defaults, ...config };
        if (!["preact", "react"].includes(merged.uiFramework)) {
          throw new Error(
            `project.config.json uiFramework must be "preact" or "react" (got: ${merged.uiFramework})`,
          );
        }
        const validateV2 = (field, value) => {
          if (value === undefined || value === null) return;
          if (typeof value !== "string") {
            throw new Error(`project.config.json ${field} must be a string`);
          }
          if (field === "vendorPrefix" && !/^[A-Z][A-Za-z0-9_]*$/.test(value)) {
            throw new Error(
              `project.config.json vendorPrefix must be valid (got: "${value}")`,
            );
          }
          if (
            field === "restNamespace" &&
            !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(value)
          ) {
            throw new Error(
              `project.config.json restNamespace must look like vendor/v1 (got: "${value}")`,
            );
          }
          if (
            (field === "phpMinVersion" || field === "phpSourceVersion") &&
            !/^\d+\.\d+(\.\d+)?$/.test(value)
          ) {
            throw new Error(
              `project.config.json ${field} must look like X.Y or X.Y.Z`,
            );
          }
          if (field === "batchEndpoint" && !value.startsWith("/")) {
            throw new Error(
              `project.config.json batchEndpoint must start with "/"`,
            );
          }
        };
        [
          "restNamespace",
          "vendorPrefix",
          "phpMinVersion",
          "phpSourceVersion",
          "batchEndpoint",
        ].forEach((field) => {
          if (config[field] !== undefined) {
            validateV2(field, config[field]);
          }
        });
        return merged;
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(
            "project.config.json is malformed or invalid JSON: " + e.message,
          );
        }
        throw e;
      }
    },
  };
});
