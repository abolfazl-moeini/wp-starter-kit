import { promises as fs } from "node:fs";
import path from "node:path";

let temporarySequence = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1)
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data)
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

async function filesUnder(root) {
  const result = [];
  async function visit(relative) {
    const directory = relative ? path.join(root, relative) : root;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result.push(child.replace(/\\/g, "/"));
      else if (entry.isSymbolicLink())
        throw new Error(`symlink cannot be archived: ${child}`);
    }
  }
  await visit("");
  return result.sort();
}

/** Create a deterministic ZIP using stored entries and fixed DOS metadata. */
export async function createCanonicalZip({ sourceRoot, outputZip, rootName }) {
  if (
    typeof rootName !== "string" ||
    rootName === "." ||
    rootName === ".." ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rootName)
  ) {
    throw new Error("rootName must be a single safe archive path segment");
  }
  const root = path.resolve(sourceRoot);
  const archive = path.resolve(outputZip);
  const relativeArchive = path.relative(root, archive);
  if (
    relativeArchive === "" ||
    (!relativeArchive.startsWith(`..${path.sep}`) &&
      relativeArchive !== ".." &&
      !path.isAbsolute(relativeArchive))
  ) {
    throw new Error("output ZIP must be outside the source tree");
  }
  try {
    const archiveStat = await fs.lstat(archive);
    if (archiveStat.isSymbolicLink() || !archiveStat.isFile())
      throw new Error("output ZIP must be a regular file");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const files = await filesUnder(root);
  if (files.length > 0xffff)
    throw new Error("ZIP32 entry-count limit exceeded");
  const local = [];
  const central = [];
  let offset = 0;
  for (const relative of files) {
    const data = await fs.readFile(path.join(root, relative));
    if (data.length > 0xffffffff || offset > 0xffffffff)
      throw new Error("ZIP32 limit exceeded");
    const name = Buffer.from(`${rootName}/${relative}`, "utf8");
    if (name.length > 0xffff)
      throw new Error(`ZIP entry name is too long: ${relative}`);
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6); // UTF-8 names, no data descriptor.
    header.writeUInt16LE(0, 8); // store
    header.writeUInt16LE(0, 10); // fixed time: 00:00:00
    header.writeUInt16LE(33, 12); // fixed date: 1980-01-01
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, name, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(0x0314, 4); // ZIP 2.0, Unix origin.
    entry.writeUInt16LE(20, 6); // needed version
    entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + data.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  await fs.mkdir(path.dirname(archive), { recursive: true });
  const temporary = `${archive}.tmp-${process.pid}-${temporarySequence++}`;
  try {
    await fs.writeFile(temporary, Buffer.concat([...local, centralBytes, end]));
    await fs.rename(temporary, archive);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return archive;
}
