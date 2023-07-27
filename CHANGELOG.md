## 1.0.1 (July 27, 2023)

### Bug Fixes

- #### fix: gc error caused by calls of the `GLib.Bytes.unref_to_array` ([#5](https://github.com/ncpa0/fs-gjs/pull/5))

  It was discovered that calls of the `GLib.Bytes.unref_to_array` were leaving the underlying `Bytes` object in a state that was causing GC to fail when trying to free up the memory taken by it. All the instances where this function was used have been updated to use the `GLib.Bytes.toArray` function instead, which should fix this issue.
