import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@reactgjs/gest";
import GLib from "gi://GLib?version=2.0";
import { Fs, SyncFs } from "../src/index";

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
    Praesent quis turpis pharetra, lobortis felis vitae, lacinia magna.
    Donec ac dolor pulvinar, laoreet libero a, pellentesque massa. 
    Mauris vel erat vitae ex suscipit euismod. Nulla commodo mollis 
    nulla, id sagittis justo eleifend at. Phasellus euismod sem eu 
    risus ultrices posuere a dignissim leo. Praesent a vulputate nibh, 
    nec accumsan nunc. Pellentesque a est nisi. In at porttitor eros, 
    non placerat ante. Curabitur quis porta eros, sit amet aliquet 
    sapien.
    
    Donec ac eros arcu. Quisque egestas ullamcorper turpis vitae pretium. 
    Vestibulum sed nisl mollis, malesuada mauris in, convallis felis.
    Maecenas mollis eros iaculis elit interdum, ac fringilla sem 
    bibendum. Maecenas rhoncus lobortis dictum. Cras ligula dolor, 
    aliquet non semper sit amet, gravida vitae elit. Praesent ac varius 
    risus. Nulla varius suscipit mauris nec vestibulum. Nulla facilisis 
    fringilla interdum. Sed consectetur ex eu fermentum rhoncus. 
    Suspendisse placerat lorem at scelerisque bibendum. In hac habitasse 
    platea dictumst. Ut facilisis, nisi in ultrices viverra, justo magna 
    dignissim augue, a sagittis erat arcu et metus. Lorem ipsum dolor sit 
    amet, consectetur adipiscing elit. Donec at commodo purus.
    `;

const encode = (str: string) => new TextEncoder().encode(str);

const compareBytes = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

let _i = 1;
const getNextTestFile = () => `test${_i++}`;

const TMP_DIR_PATH =
  GLib.get_current_dir() + "/__tests__/synciostream-test-tmp";

export default describe("SyncIOStream", () => {
  let testFile = "";
  const fs = new SyncFs({ cwd: TMP_DIR_PATH });

  beforeAll(async () => {
    const tmpDirExists = await Fs.fileExists(TMP_DIR_PATH);
    if (!tmpDirExists) {
      await Fs.makeDir(TMP_DIR_PATH);
    }
  });

  beforeEach(() => {
    testFile = getNextTestFile();
  });

  afterAll(async () => {
    const files = await Fs.listDir(TMP_DIR_PATH);

    await Promise.all(
      files.map((f) => Fs.deleteFile(f.filepath, { recursive: true }))
    );
  });

  describe("positive scenarios", () => {
    it("should manage it's state", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");

      try {
        expect(stream.state).toBe("OPEN");
      } finally {
        stream.close();
      }

      expect(stream.state).toBe("CLOSED");
    });

    it("should create a new file", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");
      stream.close();

      expect(stream.type).toBe("CREATE");

      const exists = fs.fileExists(testFile);

      expect(exists).toBe(true);
    });

    it("should open an existing file", () => {
      fs.writeTextFile(testFile, loremIpsum);

      const stream = fs.openFileIOStream(testFile, "OPEN");

      try {
        const data = stream.readAll();

        expect(new TextDecoder().decode(data)).toBe(loremIpsum);
      } finally {
        stream.close();
      }
    });

    it("should replace an existing file", () => {
      fs.writeTextFile(testFile, loremIpsum);

      const stream = fs.openFileIOStream(testFile, "REPLACE");

      try {
        const data = stream.readAll();

        expect(new TextDecoder().decode(data)).toBe("");
      } finally {
        stream.close();
      }
    });

    it("should correctly queue writes and wait for them", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");

      try {
        stream.write(encode("Hello "));
        stream.write(encode("World!\n"));
        stream.write(encode("How are you?"));
        stream.write(encode(" I'm fine!\n"));

        stream.seekFromStart(0);

        const data = stream.readAll();

        expect(new TextDecoder().decode(data)).toBe(
          "Hello World!\nHow are you? I'm fine!\n"
        );
      } finally {
        stream.close();
      }

      const fdata = fs.readTextFile(testFile);

      expect(fdata).toBe("Hello World!\nHow are you? I'm fine!\n");
    });

    it("should correctly skip bytes", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");

      try {
        stream.write(new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]));
        stream.seekFromStart(0);

        const firstTwoBytes = stream.read(2);

        expect(compareBytes(firstTwoBytes, new Uint8Array([11, 22]))).toBe(
          true
        );

        stream.skip(2);

        const nextTwoBytes = stream.read(2);

        expect(compareBytes(nextTwoBytes, new Uint8Array([55, 66]))).toBe(true);

        stream.skip(1);

        const lastTwoBytes = stream.read(2);

        expect(compareBytes(lastTwoBytes, new Uint8Array([88]))).toBe(true);

        stream.seekFromStart(1);

        stream.write(new Uint8Array([456, 789]));

        stream.seekFromStart(0);

        const data = stream.read(4);

        expect(compareBytes(data, new Uint8Array([11, 456, 789, 44]))).toBe(
          true
        );
      } finally {
        stream.close();
      }
    });

    it("Should correctly truncate", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");

      try {
        stream.write(new Uint8Array(Array.from({ length: 100 }, (_, i) => i)));
        stream.seekFromStart(0);

        stream.truncate(37);

        const data = stream.readAll();

        expect(
          compareBytes(
            data,
            new Uint8Array(Array.from({ length: 37 }, (_, i) => i))
          )
        ).toBe(true);
      } finally {
        stream.close();
      }
    });

    it("should correctly tell the cursor position", () => {
      const stream = fs.openFileIOStream(testFile, "CREATE");

      try {
        stream.write(new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]));

        expect(stream.currentPosition()).toBe(8);

        stream.seekFromStart(0);

        expect(stream.currentPosition()).toBe(0);

        stream.skip(4);

        expect(stream.currentPosition()).toBe(4);

        stream.seekFromEnd(-2);

        expect(stream.currentPosition()).toBe(6);

        stream.write(new Uint8Array([10001, 10002, 10003, 10004]));

        expect(stream.currentPosition()).toBe(10);

        stream.seekFromStart(4);

        expect(stream.currentPosition()).toBe(4);

        stream.read(2);

        expect(stream.currentPosition()).toBe(6);
      } finally {
        stream.close();
      }
    });
  });
});
