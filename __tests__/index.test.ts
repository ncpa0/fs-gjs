import { describe, expect, it } from "@reactgjs/gest";
import GLib from "gi://GLib?version=2.0";

export default describe("index", () => {
  it("should get imported without errors", async () => {
    const relative = <T>(v: T) => "file://" + GLib.get_current_dir() + "/" + v;
    // @ts-expect-error
    const index = await import(relative("dist/esm/index.mjs"));

    expect(index.default).toBeOfType("function");
    expect(index.default.writeFile).toBeOfType("function");
  });
});
