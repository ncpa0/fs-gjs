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

export enum Permission {
  OwnerRead = 0o400,
  OwnerWrite = 0o200,
  OwnerExecute = 0o100,
  GroupRead = 0o40,
  GroupWrite = 0o20,
  GroupExecute = 0o10,
  OthersRead = 0o4,
  OthersWrite = 0o2,
  OthersExecute = 0o1,
}

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
        mode |= Permission.OwnerRead;
      }

      if (permission.owner.write) {
        mode |= Permission.OwnerWrite;
      }

      if (permission.owner.execute) {
        mode |= Permission.OwnerExecute;
      }

      if (permission.group.read) {
        mode |= Permission.GroupRead;
      }

      if (permission.group.write) {
        mode |= Permission.GroupWrite;
      }

      if (permission.group.execute) {
        mode |= Permission.GroupExecute;
      }

      if (permission.others.read) {
        mode |= Permission.OthersRead;
      }

      if (permission.others.write) {
        mode |= Permission.OthersWrite;
      }

      if (permission.others.execute) {
        mode |= Permission.OthersExecute;
      }

      return mode;
    }
    default:
      throw new Error("Invalid permission type.");
  }
};
