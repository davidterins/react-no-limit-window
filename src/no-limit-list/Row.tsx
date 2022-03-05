import * as React from "react";
import { useEffect, useRef } from "react";
import { CSSProperties } from "styled-components";
import { loremIpsum } from "lorem-ipsum";

interface RowProps {
  index: number;
  style: CSSProperties;
}

const Row = ({ index, style }: any, itemHeight: number) => {
  const rowRef = useRef<any>();

  const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
  };

  useEffect(() => {
    if (rowRef.current) {
      if (!rowHeights.has(index)) {
        console.log(
          `Setting Row height ${index}: `,
          rowRef.current.clientHeight
        );

        setRowHeight(index, rowRef.current.clientHeight);
      }
    }
  }, [rowRef]);

  // let rend = () => {
  //   // let randomHeight = getRandomInt(350);
  //   return (
  //     <div style={{ ...style }}>
  //       Row: {index} {loremIpsum({ count: 10 })}
  //     </div>
  //   );
  //   const rowHeight = 20;
  //   const numberOfSections = itemHeight / rowHeight;
  //   let divs = [];

  //   for (let i = 1; i <= numberOfSections; i++) {
  //     divs.push(i);
  //   }

  //   return divs.map((sectionNumber) => {
  //     return (
  //       <div style={{ height: rowHeight }}>
  //         Row: {index} Section: {sectionNumber}
  //       </div>
  //     );
  //   });
  // };

  let cachedRowHeight = getRowHeight(index);
  let words = getWords(index);

  return (
    <div
      ref={rowRef}
      style={{
        ...style,
        height: cachedRowHeight,
      }}
    >
      <div>
        Row: {index} {words}
        {/* {rend()} */}
      </div>
    </div>
  );
};

export { Row };

const rowHeights: Map<number, number> = new Map();
const words: Map<number, string> = new Map();

const setRowHeight = (index: number, height: number) => {
  if (!rowHeights.has(index)) {
    rowHeights.set(index, height);
  } else {
    rowHeights[index] = height;
  }
};

const getWords = (index: number) => {
  if (!words.has(index)) {
    words.set(index, loremIpsum({ count: 10 }));
  }
  return words.get(index);
};

const getRowHeight = (index: number) => {
  if (rowHeights.has(index)) {
    return rowHeights[index];
  }
  return 100;
};

export { getRowHeight };
