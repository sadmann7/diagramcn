import * as React from "react";

export function useMounted() {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
