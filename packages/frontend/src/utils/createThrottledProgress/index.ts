import throttle from "lodash/throttle";

const THROTTLE_MS = 150;

export const createThrottledProgress = (
  setState: (value: number) => void,
) => {
  const throttled = throttle(setState, THROTTLE_MS);

  return {
    set: throttled,
    flush: () => {
      throttled.flush();
    },
    cancel: () => {
      throttled.cancel();
    },
  };
};
