export type FilePermission =
  | number
  | string
  | {
      owner: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
      group: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
      others: {
        read: boolean;
        write: boolean;
        execute: boolean;
      };
    };

export const parseFilePermission = (permission: FilePermission) => {
  switch (typeof permission) {
    case "number":
      return permission;
    case "string": {
      const p: FilePermission = {
        owner: {
          read: permission[0] === "r",
          write: permission[1] === "w",
          execute: permission[2] === "x",
        },
        group: {
          read: permission[3] === "r",
          write: permission[4] === "w",
          execute: permission[5] === "x",
        },
        others: {
          read: permission[6] === "r",
          write: permission[7] === "w",
          execute: permission[8] === "x",
        },
      };
      permission = p;
    }
    case "object": {
      let mode = 0;

      if (permission.owner.read) {
        mode |= 0o400;
      }

      if (permission.owner.write) {
        mode |= 0o200;
      }

      if (permission.owner.execute) {
        mode |= 0o100;
      }

      if (permission.group.read) {
        mode |= 0o40;
      }

      if (permission.group.write) {
        mode |= 0o20;
      }

      if (permission.group.execute) {
        mode |= 0o10;
      }

      if (permission.others.read) {
        mode |= 0o4;
      }

      if (permission.others.write) {
        mode |= 0o2;
      }

      if (permission.others.execute) {
        mode |= 0o1;
      }

      return mode;
    }
    default:
      throw new Error("Invalid permission type.");
  }
};
