/** @type {import("@reactgjs/gest/config").ConfigGetter} */
const getConfig = ({ vargs }) => {
  return {
    testDir: "./__tests__",
    globals: {
      _CI_: vargs.includes("--ci"),
    },
  };
};

export default getConfig;
