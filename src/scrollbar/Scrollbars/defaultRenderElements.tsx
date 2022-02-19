import React, { CSSProperties } from "react";
/* eslint-disable react/prop-types */

export function renderViewDefault(props: any) {
  return <div {...props} />;
}

export function renderTrackHorizontalDefault({ style, ...props }: any) {
  const finalStyle = {
    ...style,
    right: 2,
    bottom: 2,
    left: 2,
    borderRadius: 3,
  };
  return <div style={finalStyle} {...props} />;
}

export function renderThumbHorizontalDefault({ style, ...props }: any) {
  const finalStyle = {
    ...style,
    cursor: "pointer",
    borderRadius: "inherit",
    backgroundColor: "rgba(0,0,0,.2)",
  };
  return <div style={finalStyle} {...props} />;
}

export function renderTrackVerticalDefault({ style, ...props }: any) {
  const finalStyle = {
    ...style,
    right: 2,
    bottom: 2,
    top: 2,
    borderRadius: 3,
    backgroundColor: "gray",
  };
  return <div style={finalStyle} {...props} />;
}

export function renderThumbVerticalDefault({ style, ...props }: any) {
  const finalStyle: CSSProperties = {
    ...style,
    cursor: "pointer",
    borderRadius: "inherit",
    border: "1px solid red",
    backgroundColor: "pink",
  };
  return <div style={finalStyle} {...props} />;
}
