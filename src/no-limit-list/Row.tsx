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
  let words = getWords(index);
  // let words = null;

  return (
    <div
      style={{
        ...style,
        // height: 148,
        // border: "solid red 10px",
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
