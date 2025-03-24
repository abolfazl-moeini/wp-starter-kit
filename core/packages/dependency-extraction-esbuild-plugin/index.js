// codebase @copyright https://github.com/evanw/esbuild/issues/337#issuecomment-954633403

import {
  defaultRequestToHandle,
  internalRequestToHandle,
  defaultRequestToExternal,
} from "./utils.js";
import {
  onlyUnique,
  assetFilePath,
  writeFile,
  fileCheckSum,
  filterInternalRootPackages,
} from "./utils.js";

export { writeFile } from "./utils.js";
import json2php from "json2php";

export function importAsGlobals(mapping, collectInternalScripts) {
  return {
    name: "global-imports",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (defaultRequestToHandle(args.path)) {
          // is WordPress global script

          return {
            path: args.path,
            namespace: "external-global-wordpress",
          };
        }

        if (collectInternalScripts && internalRequestToHandle(args.path)) {
          // is WordPress global script

          if (collectInternalScripts.indexOf(args.path) === -1) {
            collectInternalScripts.push(args.path);
          }
        }

        if (mapping && mapping[args.path]) {
          return {
            path: args.path,
            namespace: "external-global-custom",
          };
        }

        return {};
      });

      build.onLoad(
        {
          filter: /.*/,
          namespace: "external-global-wordpress",
        },
        async (args) => {
          const global = defaultRequestToExternal(args.path);
          return {
            contents: `module.exports = ${global.join(".")};`,
            loader: "js",
          };
        },
      );

      build.onLoad(
        {
          filter: /.*/,
          namespace: "external-global-custom",
        },
        async (args) => {
          const global = mapping[args.path];
          return {
            contents: `module.exports = ${global};`,
            loader: "js",
          };
        },
      );
    },
  };
}

export function generateWordPressScriptHandles(buildResponse) {
  const results = [];

  if (!buildResponse?.metafile?.inputs) {
    return results;
  }

  for (const input in buildResponse.metafile.inputs) {
    const match = input.match(/external-global-wordpress:(.+)/);

    if (!match) {
      continue;
    }

    const handleID = defaultRequestToHandle(match[1]);

    handleID && results.push(handleID);
  }

  return results.filter(onlyUnique);
}

export function generateInternalScriptHandles(buildResponse) {
  const results = [];

  if (!buildResponse?.metafile?.inputs) {
    return results;
  }

  for (const input in buildResponse.metafile.inputs) {
    const match = input.match(/inernal-libraries:(.+)/);

    if (!match) {
      continue;
    }

    const handleID = defaultRequestToHandle(match[1]);

    handleID && results.push(handleID);
  }

  return results.filter(onlyUnique);
}

export function assetFileInfo(
  buildResponse,
  forceAssets = [],
  internalItems = [],
) {
  const generatedHandles = generateWordPressScriptHandles(buildResponse);
  const handles = forceAssets.length
    ? generatedHandles.concat(forceAssets)
    : generatedHandles;

  return {
    dependencies: handles ?? [],
    internal_packages: filterInternalRootPackages(internalItems),
    hash: fileCheckSum(bundleFilePath(buildResponse)),
  };
}

export async function saveAssetFile(
  buildResponse,
  forceAssets = {},
  internalItems = [],
) {
  if (!buildResponse?.metafile?.outputs) {
    return false;
  }
  const assetsInfo = assetFileInfo(buildResponse, forceAssets, internalItems);

  if (!assetsInfo) {
    return false;
  }

  const fileContent = phpFileContent(assetsInfo);

  return writeFile(assetFilePath(bundleFilePath(buildResponse)), fileContent);
}

export function phpFileContent(theObject) {
  return `<?php return ${json2php(JSON.parse(JSON.stringify(theObject)))};\n`;
}

export function bundleFilePath(buildResponse) {

  return Object.keys(buildResponse.metafile.outputs).find(
    (file) => !!file.match(/.jsx?$/i),
  );
}

export * from "./utils.js";
