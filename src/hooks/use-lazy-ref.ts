import * as React from "react";

function useLazyRef<T>(init: () => T): React.RefObject<T> {
  const ref = React.useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = init();
  }

  return ref as React.RefObject<T>;
}

export { useLazyRef };
