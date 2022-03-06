// import React from "react";
// import {
//   createPortal,
//   findDOMNode,
//   unmountComponentAtNode,
//   render,
// } from "react-dom";
// import { createElement, CSSProperties, PureComponent } from "react";

// const containerStyle: CSSProperties = {
//   display: "inline-block",
//   position: "absolute",
//   visibility: "hidden",
//   zIndex: -1,
// };

// export const getMeasureLayer = () => {
//   let measureLayer = document.getElementById("measure-layer");

//   if (!measureLayer) {
//     let measureLayer = document.createElement("div");
//     measureLayer.id = "measure-layer";
//     measureLayer.style.cssText =
//       "display:inline-block;position:absolute;visibility:visible;zIndex:1;min-width:400px;";
//     document.body.appendChild(measureLayer);
//   }

//   return measureLayer;
// };

// // export const getMeasureLayerContainer = () => {
// //   let measureLayer = document.getElementById("measure-layer");

// //   if (!measureLayer) {
// //     let measureLayer = document.createElement("div");
// //     measureLayer.id = "measure-layer";
// //     measureLayer.style.cssText =
// //       "display:inline-block;position:absolute;visibility:hidden;zIndex:-1;";
// //     document.body.appendChild(measureLayer);
// //   }

// //   return measureLayer;
// // };

// // getMeasureLayer();

// const measureElement = (itemToMeasure, preElementId) => {
//   // Creates the hidden div appended to the document body
//   const container = document.getElementById("measure-layer"); // dom element

//   // Renders the React element into the hidden div
//   render(itemToMeasure, container, () => {
//     const item = document.getElementById(preElementId); // dom element
//     console.log("PreItem", item);
//     document.removeChild(item)
//     // unmountComponentAtNode(container);
//     // container.parentNode.removeChild(container);
//   });

//   // Gets the element size
//   const height = container.clientHeight;
//   const width = container.clientWidth;
//   console.log("MeasureLayer", height, width);

//   //   const height1 = item.clientHeight;
//   //   const width1 = item.clientWidth;
//   //   console.log("Measured Item", height1, width1);

//   // Removes the element and its wrapper from the document

//   return { height, width };
// };

// // const measureElement = (element: JSX.Element) => {
// //   const measureLayer = document.getElementById("measure-layer");
// //   /*
// //    * Portals allow us to render an element inside a given DOM node.
// //    * In this case we're rendering the element we want to measure inside
// //    * the measureLayer located in the App root.
// //    */
// //   const renderedElement = createPortal(element, measureLayer);

// //   const height = (renderedElement as HTMLElement).clientHeight;
// //   const width = renderedElement.clientWidth;

// //   unmountComponentAtNode(measureLayer);

// //   return { height, width };

// //   /*
// //    * Portals allow us to render an element inside a given DOM node.
// //    * In this case we're rendering the element we want to measure inside
// //    * the measureLayer located in the App root.
// //    */

// //   console.log("MEasureLayer", measureLayer);
// //   const renderedElement = createPortal(<div>hej</div>, measureLayer);
// //   console.log("MEasureLayer", measureLayer);
// //   console.log("RENDERED", (renderedElement.children as JSX.Element).props);

// //   const height = measureLayer.clientHeight; // renderedElement.clientHeight;
// //   const width = 1; //renderedElement.clientWidth;

// //   //   ReactDOM.unmountComponentAtNode(measureLayer);

// //   return { height, width };
// // };

// export default measureElement;
