#!/usr/bin/env node
import { main } from '../src/cli.js';

// Set the exit code and let the process drain stdout on its own. On macOS a pipe is asynchronous,
// so calling process.exit() right after a large --json print would truncate the output.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code ?? 0;
  },
  (err) => {
    console.error(`keelson: ${err?.message ?? err}`);
    if (process.env.KEELSON_DEBUG) console.error(err?.stack);
    process.exitCode = 1;
  },
);
