# fs-gjs

Collection of file system utility functions for [Gnome JavaScript (GJS)](https://gitlab.gnome.org/GNOME/gjs).

## Usage

`fs-gjs` provides two sets of functions, synchronous and asynchronous. First can be accessed vias `SyncFs` class and the latter via `Fs` class. Both have almost exactly the same API, with the only difference that asynchronous functions need to be awaited.

1. [Reading files](#reading-files)
2. [Writing files](#writing-files)
3. [Appending to files](#appending-to-files)
4. [Copying files](#copying-files)
5. [Moving files](#moving-files)
6. [Deleting files](#deleting-files)
7. [Creating directories](#creating-directories)
8. [Create symbolic links](#create-symbolic-links)
9. [Change file permissions](#change-file-permissions)
10. [Change file ownership](#change-file-ownership)
11. [List directory contents](#list-directory-contents)
12. [Check if file exists](#check-if-file-exists)
13. [Get file info](#get-file-info)
14. [IOStreams](#iostreams)

### Reading files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

// Read file as bytes
const bytes = await Fs.readFile("/path/to/file");

// Read file as text
const text = await Fs.readTextFile("/path/to/file");
```

### Writing files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

// Write bytes to file
const bytes = new Uint8Array([1, 2, 3]);
await Fs.writeFile("/path/to/file", bytes);

// Write text to file
const text = "Hello, world!";
await Fs.writeTextFile("/path/to/file", text);
```

### Appending to files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

// Append bytes to file
const bytes = new Uint8Array([1, 2, 3]);
await Fs.appendFile("/path/to/file", bytes);

// Append text to file
const text = "Hello, world!";
await Fs.appendTextFile("/path/to/file", text);
```

### Copying files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.copyFile("/path/to/source", "/path/to/destination");
```

### Moving files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.moveFile("/path/to/source", "/path/to/destination");
```

### Deleting files

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

// Permanently delete file
await Fs.deleteFile("/path/to/file");

// Move file to trash
await Fs.deleteFile("/path/to/file", { trash: true });
```

### Creating directories

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.makeDir("/path/to/directory");
```

### Create symbolic links

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.makeLink("/path/to/link", "/path/to/target");
```

### Change file permissions

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.chmod("/path/to/file", 0o755);
// or
await Fs.chmod("/path/to/file", "rwxr-xr-x");
// or
await Fs.chmod("/path/to/file", {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  others: { read: true, write: false, execute: true },
});
```

### Change file ownership

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.chown("/path/to/file", /* uid */ 1000, /* gid */ 1000);
```

### List directory contents

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

// get array of FileInfo objects
await Fs.listDir("/path/to/directory");

// get array of file names
await Fs.listFilenames("/path/to/directory");
```

### Check if file exists

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.fileExists("/path/to/file");
```

### Get file info

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

await Fs.fileInfo("/path/to/file");
```

### IOStreams

IOStreams can be opened in one of three modes:

- `CREATE` - a new file will be created, will fail if file already exists
- `REPLACE` - a new file will be created, will replace existing file if it exists
- `OPEN` - an existing file will be opened, will fail if file does not exist

```ts
import { Fs } from "./node_modules/fs-gjs/index.js";

const stream = await Fs.openIOStream("/path/to/file", "CREATE");

// Read the first 1024 bytes from stream
const bytes = await stream.read(1024);

// Read all the remaining bytes from stream
const bytes = await stream.readAll();

// Write bytes to stream
const bytes = new Uint8Array([1, 2, 3]);
await stream.write(bytes);

// Skip 1024 bytes from the stream
await stream.skip(1024);

// Move cursor position by 1024 bytes forward
await stream.seek(1024);

// Move cursor to 1024 from the stream start
await stream.seekFromStart(1024);

// Move cursor to 1024 from the stream end
await stream.seekFromEnd(1024);

// Truncate the stream to the length of 1024 bytes
await stream.truncate(1024);

// Get current cursor position
const position = await stream.currentPosition();

// Close the stream
await stream.close();
```
