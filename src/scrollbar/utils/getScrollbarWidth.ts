import css from "dom-css";
let scrollbarWidth = 0;

export default function getScrollbarWidth() {
  if (scrollbarWidth != 0) return scrollbarWidth;

  /* istanbul ignore else */
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    css(div, {
      width: 100,
      height: 100,
      position: "absolute",
      top: -9999,
      overflow: "scroll",
      MsOverflowStyle: "scrollbar",
    });

    document.body.appendChild(div);
    scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
  } else {
    scrollbarWidth = 0;
  }
  console.log("HERE! " + scrollbarWidth);

  return scrollbarWidth || 0;
}
