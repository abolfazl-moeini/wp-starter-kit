import path from "node:path";
import {
  assemblePrivateRuntime as assemble,
  buildPrivateStateKey,
  buildRuntimePrefix,
  validateArtifactRegistry,
} from "../../../packages/create-wp-project/src/release/private-runtime-assembler.js";

export { buildPrivateStateKey, buildRuntimePrefix, validateArtifactRegistry };

export function assemblePrivateRuntime(options) {
  return assemble({
    ...options,
    astTransformScript: path.join(
      process.cwd(),
      "packages/create-wp-project/src/release/php-ast-transform.php",
    ),
  });
}
