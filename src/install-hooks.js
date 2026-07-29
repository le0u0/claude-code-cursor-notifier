#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { installHooks } = require("./settings");

const hookPath = process.argv[2];
if (!hookPath) {
  process.stderr.write("Usage: install-hooks.js <hook-path>\n");
  process.exit(1);
}

installHooks(path.resolve(hookPath));
