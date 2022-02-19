export const scrollLeft = (view: HTMLElement, left = 0) => {
  if (!view) return;
  view.scrollLeft = left;
};

export const scrollTop = (view: HTMLElement, top = 0) => {
  if (!view) return;
  view.scrollTop = top;
};

export const scrollToLeft = (view: HTMLElement) => {
  if (!view) return;
  view.scrollLeft = 0;
};

export const scrollToTop = (view: HTMLElement) => {
  if (!view) return;
  view.scrollTop = 0;
};

export const scrollToRight = (view: HTMLElement) => {
  if (!view) return;
  view.scrollLeft = view.scrollWidth;
};

export const scrollToBottom = (
  view: HTMLElement,
  virtualizedScrollHeight: number
) => {
  if (!view) return;
  view.scrollTop = virtualizedScrollHeight; // this.view.scrollHeight;
};

// getScrollLeft() {
//   if (!this.view) return 0;
//   return this.view.scrollLeft;
// }

// getScrollTop() {
//   if (!this.view) return 0;
//   return this.view.scrollTop;
// }

// getScrollWidth() {
//   if (!this.view) return 0;
//   return this.view.scrollWidth;
// }

// getScrollHeight() {
//   if (!this.view) return 0;
//   return this.props.virtualizedScrollHeight; // this.view.scrollHeight;
// }

// getClientWidth() {
//   if (!this.view) return 0;
//   return this.view.clientWidth;
// }

// getClientHeight() {
//   if (!this.view) return 0;
//   return this.view.clientHeight;
// }
