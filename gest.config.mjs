/** @type {import("@reactgjs/gest/config").ConfigGetter} */
const getConfig = ({ vargs }) => {
  const _CI_ = vargs.includes("--ci");

  return {
    testDir: "./__tests__",
    parallel: 4,
    multiprocessing: true,
    globals: {
      _CI_,
    },
  };
};

export default getConfig;
