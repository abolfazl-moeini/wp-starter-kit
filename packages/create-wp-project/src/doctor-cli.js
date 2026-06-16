#!/usr/bin/env node
import { doctorProject } from "./doctor.js";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: doctor-cli <dir>");
  process.exit(1);
}
const res = doctorProject(dir);
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
