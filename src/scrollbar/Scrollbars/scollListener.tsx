import * as React from "react";
import { useEffect, useRef } from "react";

interface ScrollListenerProps {
  onScroll: () => {};
}

const ScrollListener: React.FC<ScrollListenerProps> = () => {
  let divRef = useRef<HTMLDivElement>();
  const handleMouseWheel = () => {
    //   divRef.current.
  };

  useEffect(() => {
    return;
  }, []);
  return <div ref={divRef}></div>;
};

export default ScrollListener;
