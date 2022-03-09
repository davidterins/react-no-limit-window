import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { CSSProperties } from "styled-components";
import { loremIpsum } from "lorem-ipsum";

interface RowProps {
  index: number;
  style: CSSProperties;
}
const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
};
const Row = ({ index, style }: any, itemHeight: number) => {
  // const rowRef = useRef<any>();

  // useEffect(() => {
  //   if (rowRef.current) {
  //     // if (!rowHeights.has(index)) {
  //     console.log(`Setting Row height ${index}: `, rowRef.current.clientHeight);

  //     let renderedHeight = rowRef.current.clientHeight;

  //     setRowHeight(index, renderedHeight);
  //     // }
  //   }
  // }, [rowRef]);

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

  // let cachedRowHeight = getRowHeight(index);
  // let words = getWords(index);
  
  let words = null;

  return (
    <div
      style={{
        ...style,
        height: 148,
        border: "solid red 1px",
      }}
    >
      Row: {index} {words}
    </div>
  );
};

export { Row };

const words: Map<number, string> = new Map();

const getWords = (index: number) => {
  if (!words.has(index)) {
    const randomLength = getRandomInt(30);

    words.set(index, loremIpsum({ count: randomLength }));
  }
  return words.get(index);
};
