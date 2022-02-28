import * as React from "react";
import { useEffect, useRef } from "react";
import { CSSProperties } from "styled-components";

interface RowProps {
  index: number;
  style: CSSProperties;
}

const Row = ({ index, style }: any, itemHeight: number) => {
  const rowRef = useRef<any>();

  const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
  };
  // const rowHeight = getRandomInt(230);

  useEffect(() => {
    if (rowRef.current) {
      // setRowHeight(index, rowRef.current.clientHeight);
    }
  }, [rowRef]);

  let rend = () => {
    const rowHeight = 20;
    const numberOfSections = itemHeight / rowHeight;
    let divs = [];

    for (let i = 1; i <= numberOfSections; i++) {
      divs.push(i);
    }

    return divs.map((sectionNumber) => {
      return (
        <div style={{ height: rowHeight }}>
          Row: {index} Section: {sectionNumber}
        </div>
      );
    });
  };

  return (
    <div ref={rowRef} style={{ ...style, height: itemHeight }}>
      {rend()}
    </div>
  );
};

export { Row };

const rowHeights: Map<number, number> = new Map();

const setRowHeight = (index: number, height: number) => {
  if (!rowHeights.has(index)) {
    rowHeights.set(index, height);
  } else {
    rowHeights[index] = height;
  }
};

const getRowHeight = (index: number) => {
  if (rowHeights.has(index)) {
    return rowHeights[index];
  }
  return 35;
};
