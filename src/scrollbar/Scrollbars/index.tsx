import raf, { cancel as caf } from "raf";
import css from "dom-css";
import PropTypes from "prop-types";
import {
  Component,
  createElement,
  cloneElement,
  createRef,
  CSSProperties,
  useRef,
  useEffect,
} from "react";
import isString from "../utils/isString";
import getScrollbarWidth from "../utils/getScrollbarWidth";
import returnFalse from "../utils/returnFalse";
import getInnerWidth from "../utils/getInnerWidth";
import getInnerHeight from "../utils/getInnerHeight";
import {
  containerStyleDefault,
  containerStyleAutoHeight,
  viewStyleDefault,
  viewStyleAutoHeight,
  viewStyleUniversalInitial,
  trackHorizontalStyleDefault,
  trackVerticalStyleDefault,
  thumbHorizontalStyleDefault,
  thumbVerticalStyleDefault,
  disableSelectStyle,
  disableSelectStyleReset,
} from "./styles";
import {
  renderViewDefault,
  renderTrackHorizontalDefault,
  renderTrackVerticalDefault,
  renderThumbHorizontalDefault,
  renderThumbVerticalDefault,
} from "./defaultRenderElements";
import React from "react";
import { propTypes } from "./scrollbar.types";

interface State {
  didMountUniversal: boolean;
}

interface ViewPortElementValues {
  left: number;
  top: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

interface ScrollUpdateArgs {
  nativeScrollStatus: ScrollInfo;
  customScrollStatus: ScrollInfo;
}

interface ScrollInfo {
  top: number;
  scrollTop: number;
  clientHeight: number; // maxHeight - scrollTop.
  maxHeight: number;
  atBottom: boolean;
  atTop: boolean;
}

export interface IScrollBar {
  setScrollHeight: (scrollHeight: number) => void;
  setScrollPos: (newScrollPos: number) => void;
}

export default class Scrollbar
  extends Component<ScrollbarProps, State>
  implements IScrollBar
{
  testRef: any;
  viewPort: HTMLElement;
  container!: Element;
  thumbVertical!: HTMLElement;
  trackVertical!: HTMLElement;
  thumbHorizontal!: HTMLElement;
  trackHorizontal!: HTMLElement;

  scrolling: boolean = false;
  dragging: boolean = false;
  trackMouseOver: boolean = false;

  virtualizedHeight: number = 0;
  scrollSpeed: number = 0;

  prevPageX: number = 0;
  prevPageY: number = 0;

  lastViewScrollLeft: number | undefined;
  viewScrollLeft: number | undefined;
  lastViewScrollTop: number | undefined;
  viewScrollTop: number | undefined;

  requestFrame: number | undefined;

  fakeScrollTop: number = 0;

  nativeScrollStatus: ScrollInfo = {
    top: 0,
    scrollTop: 0,
    clientHeight: 0,
    maxHeight: 0,
    atBottom: false,
    atTop: true,
  };

  customScrollStatus: ScrollInfo = {
    top: 0,
    scrollTop: 0,
    clientHeight: 0,
    maxHeight: 0,
    atBottom: false,
    atTop: true,
  };

  hideTracksTimeout!: NodeJS.Timeout;
  detectScrollingInterval!: NodeJS.Timer;
  static defaultProps: {
    renderView: (props: any) => JSX.Element;
    renderTrackHorizontal: ({ style, ...props }: any) => JSX.Element;
    renderTrackVertical: ({ style, ...props }: any) => JSX.Element;
    renderThumbHorizontal: ({ style, ...props }: any) => JSX.Element;
    renderThumbVertical: ({ style, ...props }: any) => JSX.Element;
    tagName: string;
    thumbMinSize: number;
    hideTracksWhenNotNeeded: boolean;
    autoHide: boolean;
    autoHideTimeout: number;
    autoHideDuration: number;
    autoHeight: boolean;
    autoHeightMin: number;
    autoHeightMax: number;
    universal: boolean;
    scrollToOffset: number;
  };
  constructor(props: ScrollbarProps, rest) {
    super(props, rest);
    this.testRef = createRef();
    this.syncScrollStatus = this.syncScrollStatus.bind(this);
    this.updateScrollBarStyle = this.updateScrollBarStyle.bind(this);
    this.getViewPortElementValues = this.getViewPortElementValues.bind(this);
    this.getThumbHorizontalWidth = this.getThumbHorizontalWidth.bind(this);
    this.getThumbVerticalHeight = this.getThumbVerticalHeight.bind(this);
    this.getScrollLeftForOffset = this.getScrollLeftForOffset.bind(this);
    this.getScrollTopForOffset = this.getScrollTopForOffset.bind(this);

    this.handleTrackMouseEnter = this.handleTrackMouseEnter.bind(this);
    this.handleTrackMouseLeave = this.handleTrackMouseLeave.bind(this);
    this.handleHorizontalTrackMouseDown =
      this.handleHorizontalTrackMouseDown.bind(this);
    this.handleVerticalTrackMouseDown =
      this.handleVerticalTrackMouseDown.bind(this);
    this.handleHorizontalThumbMouseDown =
      this.handleHorizontalThumbMouseDown.bind(this);
    this.handleVerticalThumbMouseDown =
      this.handleVerticalThumbMouseDown.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.setScrollHeight = this.setScrollHeight.bind(this);
    this.setScrollPos = this.setScrollPos.bind(this);

    this.state = {
      didMountUniversal: false,
    };
  }

  setScrollPos(virtualizedOffset: number) {
    let percentage = virtualizedOffset / this.virtualizedHeight;
    let offset = this.viewPort.clientHeight * percentage;
    this.fakeScrollTop = this.getScrollTopForOffset(offset);

    this.update(0, (updatedScrollArgs) => {
      const { nativeScrollStatus, customScrollStatus } = updatedScrollArgs;

      this.viewScrollTop = customScrollStatus.scrollTop;
      this.customScrollStatus = customScrollStatus;
      this.nativeScrollStatus = nativeScrollStatus;

      const clampedScrollTop = this.clamp(
        this.customScrollStatus.scrollTop,
        0,
        this.virtualizedHeight - this.getThumbVerticalHeight()
      );

      if (clampedScrollTop == NaN) {
        throw `Sroll top Nan`;
      }

      this.props.onScroll(
        this.viewPort.clientHeight,
        this.virtualizedHeight,
        clampedScrollTop
      );
    });
  }

  setScrollHeight(newVirtualizedHeight: number) {
    console.log("SET VERT HEIGHT!", newVirtualizedHeight);
    this.virtualizedHeight = newVirtualizedHeight;
    this.scrollSpeed = (this.props.height / this.virtualizedHeight) * 20;

    const clientHeight = this.getViewPortElementValues().clientHeight;
    const currentScrollEnd = this.fakeScrollTop + clientHeight;

    if (currentScrollEnd > newVirtualizedHeight) {
      const scrollTopWithinBoundaries = newVirtualizedHeight - clientHeight;
      this.fakeScrollTop = scrollTopWithinBoundaries;
      this.props.onScroll(
        clientHeight,
        this.virtualizedHeight,
        scrollTopWithinBoundaries
      );
    }
  }

  componentDidMount() {
    this.addListeners();
    if (this.props.scrollToOffset) {
      let percentage = this.props.scrollToOffset / this.virtualizedHeight;
      let offset = this.viewPort.clientHeight * percentage;
      this.fakeScrollTop = this.getScrollTopForOffset(offset);
      this.update(0, (updatedScrollArgs) => {
        const { nativeScrollStatus, customScrollStatus } = updatedScrollArgs;
        this.viewScrollTop = customScrollStatus.scrollTop;
        this.customScrollStatus = customScrollStatus;
        this.nativeScrollStatus = nativeScrollStatus;
        const clampedScrollTop = this.clamp(
          this.customScrollStatus.scrollTop,
          0,
          this.virtualizedHeight - this.getThumbVerticalHeight()
        );
        if (clampedScrollTop == NaN) {
          throw `Sroll top Nan`;
        }
        this.props.onScroll(
          this.viewPort.clientHeight,
          this.virtualizedHeight,
          clampedScrollTop
        );
      });
    } else {
      this.update();
    }
    this.componentDidMountUniversal();
  }

  componentDidMountUniversal() {
    // eslint-disable-line react/sort-comp
    const { universal } = this.props;
    if (!universal) return;
    this.setState({ didMountUniversal: true });
  }

  componentDidUpdate() {
    this.update();
  }

  componentWillUnmount() {
    this.removeListeners();
    caf(this.requestFrame as number);
    clearTimeout(this.hideTracksTimeout);
    clearInterval(this.detectScrollingInterval);
  }

  getViewPortElementValues(): ViewPortElementValues {
    let {
      scrollLeft = 0,
      scrollTop = 0,
      scrollWidth = 0,
      scrollHeight = 0,
      clientWidth = 0,
      clientHeight = 0,
    } = this.viewPort || {};

    return {
      left: scrollLeft / (scrollWidth - clientWidth) || 0,
      top: scrollTop / (scrollHeight - clientHeight) || 0,
      scrollLeft,
      scrollTop,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
    };
  }

  getThumbHorizontalWidth() {
    const { thumbSize, thumbMinSize } = this.props;
    const { scrollWidth, clientWidth } = this.viewPort;
    const trackWidth = getInnerWidth(this.trackHorizontal);
    const width = Math.ceil((clientWidth / scrollWidth) * trackWidth);
    if (trackWidth === width) return 0;
    if (thumbSize) return thumbSize;
    return Math.max(width, thumbMinSize);
  }

  getThumbVerticalHeight() {
    const { thumbSize, thumbMinSize } = this.props;
    const { clientHeight } = this.getViewPortElementValues(); // this.viewPort;
    const scrollHeight = this.virtualizedHeight;
    // const scrollHeight = this.props.virtualizedScrollHeight;
    const trackHeight = getInnerHeight(this.trackVertical);
    const height = Math.ceil((clientHeight / scrollHeight) * trackHeight);
    if (trackHeight === height) return 0;
    if (thumbSize) return thumbSize;
    return Math.max(height, thumbMinSize);
  }

  getScrollLeftForOffset(offset) {
    const { scrollWidth, clientWidth } = this.viewPort;
    const trackWidth = getInnerWidth(this.trackHorizontal);
    const thumbWidth = this.getThumbHorizontalWidth();
    return (offset / (trackWidth - thumbWidth)) * (scrollWidth - clientWidth);
  }

  /**Gets the mapped scrollTop for and offset relative to the scroll bar*/
  getScrollTopForOffset(offset: number) {
    const { clientHeight } = this.getViewPortElementValues(); // this.viewPort;
    const virtualizedHeight = this.virtualizedHeight;
    const trackHeight = getInnerHeight(this.trackVertical);
    const thumbHeight = this.getThumbVerticalHeight();

    const scrollTopOffsetResult =
      (offset / (trackHeight - thumbHeight)) *
      (virtualizedHeight - clientHeight);

    // const scrollEndOffsetResult = scrollTopOffsetResult + clientHeight;
    // if (scrollEndOffsetResult > virtualizedHeight) {
    //   return virtualizedHeight - clientHeight;
    // }
    return scrollTopOffsetResult;
  }

  handleWheel(args: Event) {
    const wheelEvent = args as WheelEvent;
    let scrollDelta = wheelEvent?.deltaY / 100; // deltaY on chrome is either 100 or 200.

    this.update(scrollDelta, (updatedScrollArgs) => {
      const { nativeScrollStatus, customScrollStatus } = updatedScrollArgs;

      // const { customScrollTop, scrollLeft, scrollTop, scrollHeight } = values;
      // this.viewScrollLeft = customScrollStatus;
      this.viewScrollTop = customScrollStatus.scrollTop;

      this.customScrollStatus = customScrollStatus;
      this.nativeScrollStatus = nativeScrollStatus;

      // this.nativeScrollStatus.scrollTop = scrollTop;

      // console.log("scrollheight: " + this.viewPort.scrollHeight);
      // console.log("height: " + this.viewPort.clientHeight);
      // console.log("offsetHeight: " + this.viewPort.offsetHeight);
      // this.nativeScrollAtBottom =
      //   this.nativeScrollTop + this.viewPort.clientHeight ==
      //   this.viewPort.scrollHeight;

      // // console.log("BOTTOM: " + this.nativeScrollAtBottom);

      // if(this.nativeScrollAtBottom && vie)

      // this.syncScrollStatus(customScrollTop, scrollTop);

      const clampedScrollTop = this.clamp(
        this.customScrollStatus.scrollTop,
        0,
        this.virtualizedHeight - this.getThumbVerticalHeight()
        // this.props.virtualizedScrollHeight - this.getThumbVerticalHeight()
      );

      if (clampedScrollTop === NaN) {
        throw `Sroll top Nan`;
      }

      this.props.onScroll(
        this.viewPort.clientHeight,
        this.virtualizedHeight,
        // this.props.virtualizedScrollHeight,
        clampedScrollTop
      );
      // Add this to update child view.
      // (this.testRef as IListView).SetViewPort(
      //   this.viewPort.clientHeight,
      //   this.props.virtualizedScrollHeight,
      //   this.customScrollStatus.scrollTop
      // );
    });
    // if (k.deltaY > 0) {

    // } else {
    // }
    this.detectScrolling();
  }

  addListeners() {
    /* istanbul ignore if */
    if (typeof document === "undefined" || !this.viewPort) return;
    const {
      viewPort: view,
      trackHorizontal,
      trackVertical,
      thumbHorizontal,
      thumbVertical,
    } = this;
    view.addEventListener("mousewheel", this.handleWheel);
    // view.addEventListener("scroll", this.handleScroll);
    // if (!getScrollbarWidth()) return; TODO: Not sure what this is doing but solved dragging issue on osx, comment for now...
    trackHorizontal.addEventListener("mouseenter", this.handleTrackMouseEnter);
    trackHorizontal.addEventListener("mouseleave", this.handleTrackMouseLeave);
    trackHorizontal.addEventListener(
      "mousedown",
      this.handleHorizontalTrackMouseDown
    );
    trackVertical.addEventListener("mouseenter", this.handleTrackMouseEnter);
    trackVertical.addEventListener("mouseleave", this.handleTrackMouseLeave);
    trackVertical.addEventListener(
      "mousedown",
      this.handleVerticalTrackMouseDown
    );
    thumbHorizontal.addEventListener(
      "mousedown",
      this.handleHorizontalThumbMouseDown
    );
    thumbVertical.addEventListener(
      "mousedown",
      this.handleVerticalThumbMouseDown
    );
    window.addEventListener("resize", this.handleWindowResize);
  }

  removeListeners() {
    /* istanbul ignore if */
    if (typeof document === "undefined" || !this.viewPort) return;
    const {
      viewPort: view,
      trackHorizontal,
      trackVertical,
      thumbHorizontal,
      thumbVertical,
    } = this;
    view.removeEventListener("mousewheel", this.handleWheel);
    // view.removeEventListener("scroll", this.handleScroll);
    // if (!getScrollbarWidth()) return; TODO: Not sure what this is doing but solved dragging issue on osx, comment for now...
    trackHorizontal.removeEventListener(
      "mouseenter",
      this.handleTrackMouseEnter
    );
    trackHorizontal.removeEventListener(
      "mouseleave",
      this.handleTrackMouseLeave
    );
    trackHorizontal.removeEventListener(
      "mousedown",
      this.handleHorizontalTrackMouseDown
    );
    trackVertical.removeEventListener("mouseenter", this.handleTrackMouseEnter);
    trackVertical.removeEventListener("mouseleave", this.handleTrackMouseLeave);
    trackVertical.removeEventListener(
      "mousedown",
      this.handleVerticalTrackMouseDown
    );
    thumbHorizontal.removeEventListener(
      "mousedown",
      this.handleHorizontalThumbMouseDown
    );
    thumbVertical.removeEventListener(
      "mousedown",
      this.handleVerticalThumbMouseDown
    );
    window.removeEventListener("resize", this.handleWindowResize);
    // Possibly setup by `handleDragStart`
    this.teardownDragging();
  }

  scrollIsAtTop(scrollTop: number) {
    return scrollTop == 0;
  }

  handleScrollStart() {
    const { onScrollStart } = this.props;
    if (onScrollStart) onScrollStart();
    this.handleScrollStartAutoHide();
  }

  handleScrollStartAutoHide() {
    const { autoHide } = this.props;
    if (!autoHide) return;
    this.showTracks();
  }

  handleScrollStop() {
    const { onScrollStop } = this.props;
    if (onScrollStop) onScrollStop();
    this.handleScrollStopAutoHide();
  }

  handleScrollStopAutoHide() {
    const { autoHide } = this.props;
    if (!autoHide) return;
    this.hideTracks();
  }

  handleWindowResize() {
    // this.update();
  }

  handleHorizontalTrackMouseDown(event) {
    event.preventDefault();
    const { target, clientX } = event;
    const { left: targetLeft } = target.getBoundingClientRect();
    const thumbWidth = this.getThumbHorizontalWidth();
    const offset = Math.abs(targetLeft - clientX) - thumbWidth / 2;
    this.viewPort.scrollLeft = this.getScrollLeftForOffset(offset);
  }

  handleVerticalTrackMouseDown(event) {
    event.preventDefault();
    const { target, clientY } = event;
    const { top: targetTop } = target.getBoundingClientRect();
    const thumbHeight = this.getThumbVerticalHeight();
    const offset = Math.abs(targetTop - clientY) - thumbHeight / 2;
    this.viewPort.scrollTop = this.getScrollTopForOffset(offset);
  }

  handleHorizontalThumbMouseDown(event) {
    event.preventDefault();
    this.handleDragStart(event);
    const { target, clientX } = event;
    const { offsetWidth } = target;
    const { left } = target.getBoundingClientRect();
    this.prevPageX = offsetWidth - (clientX - left);
  }

  handleVerticalThumbMouseDown(event) {
    event.preventDefault();
    this.handleDragStart(event);
    const { target, clientY } = event;
    const { offsetHeight } = target;
    const { top } = target.getBoundingClientRect();
    this.prevPageY = offsetHeight - (clientY - top);
  }

  setupDragging() {
    css(document.body, disableSelectStyle);
    document.addEventListener("mousemove", this.handleDrag);
    document.addEventListener("mouseup", this.handleDragEnd);
    document.onselectstart = returnFalse;
  }

  teardownDragging() {
    css(document.body, disableSelectStyleReset);
    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.handleDragEnd);
    // document.onselectstart = undefined;
    document.onselectstart = null;
  }

  handleDragStart(event) {
    this.dragging = true;
    event.stopImmediatePropagation();
    this.setupDragging();
  }

  handleDrag(event: MouseEvent) {
    if (this.prevPageX) {
      const { clientX } = event;
      const { left: trackLeft } = this.trackHorizontal.getBoundingClientRect();
      const thumbWidth = this.getThumbHorizontalWidth();
      const clickPosition = thumbWidth - this.prevPageX;
      const offset = -trackLeft + clientX - clickPosition;
      this.viewPort.scrollLeft = this.getScrollLeftForOffset(offset);
    }
    if (this.prevPageY) {
      // The clientY read-only property of the MouseEvent interface provides the vertical coordinate
      // within the application's viewport at which the event occurred.
      const { clientY: mouseDownYPos } = event;

      const { top: trackTop } = this.trackVertical.getBoundingClientRect();
      const thumbHeight = this.getThumbVerticalHeight();
      const clickPosition = thumbHeight - this.prevPageY;
      const offset = -trackTop + mouseDownYPos - clickPosition;

      // // console.log("trackTop: " + trackTop);
      // // console.log("mouseDownYPos: " + mouseDownYPos);
      // // console.log("clickPos: " + clickPosition);
      // // console.log("OFFSET: " + offset);

      // this.viewPort.scrollTop = this.getRandom(); // this.getScrollTopForOffset(offset);
      this.fakeScrollTop = this.getScrollTopForOffset(offset);
      this.handleWheel(null);
    }
    return false;
  }

  // num: 0;
  // forceTriggerNativeScrollEvent = () => {
  //   if (this.num == 0) {
  //     this.num += 1;
  //   } else {
  //     this.num = 0;
  //   }
  //   // Setting scrollTop triggers native scroll event.
  //   this.viewPort.scrollTop = this.num;
  //   return this.num;
  // };

  handleDragEnd() {
    this.dragging = false;
    this.prevPageX = this.prevPageY = 0;
    this.teardownDragging();
    this.handleDragEndAutoHide();
  }

  handleDragEndAutoHide() {
    const { autoHide } = this.props;
    if (!autoHide) return;
    this.hideTracks();
  }

  handleTrackMouseEnter() {
    this.trackMouseOver = true;
    this.handleTrackMouseEnterAutoHide();
  }

  handleTrackMouseEnterAutoHide() {
    const { autoHide } = this.props;
    if (!autoHide) return;
    this.showTracks();
  }

  handleTrackMouseLeave() {
    this.trackMouseOver = false;
    this.handleTrackMouseLeaveAutoHide();
  }

  handleTrackMouseLeaveAutoHide() {
    const { autoHide } = this.props;
    if (!autoHide) return;
    this.hideTracks();
  }

  showTracks() {
    clearTimeout(this.hideTracksTimeout);
    css(this.trackHorizontal, { opacity: 1 });
    css(this.trackVertical, { opacity: 1 });
  }

  hideTracks() {
    if (this.dragging) return;
    if (this.scrolling) return;
    if (this.trackMouseOver) return;
    const { autoHideTimeout } = this.props;
    clearTimeout(this.hideTracksTimeout);

    this.hideTracksTimeout = setTimeout(() => {
      css(this.trackHorizontal, { opacity: 0 });
      css(this.trackVertical, { opacity: 0 });
    }, autoHideTimeout);
  }

  detectScrolling() {
    if (this.scrolling) return;
    this.scrolling = true;
    this.handleScrollStart();
    this.detectScrollingInterval = setInterval(() => {
      if (
        this.lastViewScrollLeft === this.viewScrollLeft &&
        this.lastViewScrollTop === this.viewScrollTop
      ) {
        clearInterval(this.detectScrollingInterval);
        this.scrolling = false;
        this.handleScrollStop();
      }
      this.lastViewScrollLeft = this.viewScrollLeft;
      this.lastViewScrollTop = this.viewScrollTop;
    }, 100);
  }

  raf(callback) {
    if (this.requestFrame) raf.cancel(this.requestFrame);
    this.requestFrame = raf(() => {
      this.requestFrame = undefined;
      callback();
    });
  }

  update(
    scrollDelta: number = 0,
    callback: (values: ScrollUpdateArgs) => void = () => {}
  ) {
    this.raf(() => this._update(scrollDelta, callback));
  }

  clamp = (num: number, min: number, max: number) =>
    Math.min(Math.max(num, min), max);

  syncScrollStatus(customScrollTop: number, nativeScrolltop: number) {
    let nativeAtBottom = this.scrollIsAtBottom(
      nativeScrolltop,
      this.viewPort.clientHeight,
      this.viewPort.scrollHeight
    );

    const trackVerticalHeight = getInnerHeight(this.trackVertical);
    const thumbVerticalHeight = this.getThumbVerticalHeight();
    const thumbMaxPos = trackVerticalHeight - thumbVerticalHeight;

    let clampedScrollPos = this.clamp(customScrollTop, 0, thumbMaxPos);
    // console.log(`sks: ${clampedScrollPos}, ${thumbMaxPos}`);

    let customAtBottom = clampedScrollPos == thumbMaxPos;

    // console.log(`native: ${nativeAtBottom}, custom: ${customAtBottom}`);
  }

  scrollIsAtBottom(
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number
  ) {
    return scrollTop + clientHeight == scrollHeight;
  }

  ignoreNextUpdate: boolean = false;

  _update(scrollDelta: number, callback: (values: ScrollUpdateArgs) => void) {
    const { onUpdate, hideTracksWhenNotNeeded } = this.props;

    const {
      scrollLeft,
      clientWidth,
      scrollWidth,
      clientHeight,
      scrollHeight,
      scrollTop,
      top,
    } = this.getViewPortElementValues();

    // if (getScrollbarWidth() > 0) {
    const trackHorizontalWidth = getInnerWidth(this.trackHorizontal);
    const thumbHorizontalWidth = this.getThumbHorizontalWidth();
    const thumbHorizontalX =
      (scrollLeft / (scrollWidth - clientWidth)) *
      (trackHorizontalWidth - thumbHorizontalWidth);
    const thumbHorizontalStyle = {
      width: thumbHorizontalWidth,
      transform: `translateX(${thumbHorizontalX}px)`,
    };
    let nativeUpdatedScrollInfo: ScrollInfo = {
      top: top,
      clientHeight: clientHeight,
      scrollTop: scrollTop,
      maxHeight: scrollHeight, // probably not needed
      atBottom: this.scrollIsAtBottom(scrollTop, clientHeight, scrollHeight),
      atTop: scrollTop == 0,
    };

    // console.log(JSON.stringify(nativeUpdatedScrollInfo));
    const virtualizedScrollHeight = this.virtualizedHeight;
    const trackVerticalHeight = getInnerHeight(this.trackVertical);
    const thumbVerticalHeight = this.getThumbVerticalHeight();

    const scrollTopMax = virtualizedScrollHeight - thumbVerticalHeight;
    const clampedScrollTopPos = this.clamp(
      Math.floor(this.fakeScrollTop),
      0,
      scrollTopMax
    );

    console.log("custom scrolltop", clampedScrollTopPos);
    // const virtualizedScrollHeight = this.props.virtualizedScrollHeight;
    // console.log("THUMBHEIGHT: " + thumbVerticalHeight);
    const thumbMinPos = 0;
    const thumbMaxPos = trackVerticalHeight - thumbVerticalHeight;

    let thumbVerticalPosRaw =
      (clampedScrollTopPos / (virtualizedScrollHeight - clientHeight)) *
      thumbMaxPos;

    const thumbVerticalY = this.clamp(
      thumbVerticalPosRaw,
      thumbMinPos,
      thumbMaxPos
    );

    // console.log("ää vert pos clamp: ", thumbVerticalY);

    let customUpdateScrollInfo: ScrollInfo = {
      top: 0, //customScrollTop / (virtualizedScrollHeight - clientHeight) || 0,
      clientHeight: clientHeight,
      scrollTop: clampedScrollTopPos,
      maxHeight: scrollHeight, // probably not needed
      atBottom: thumbVerticalY == thumbMaxPos,
      atTop: clampedScrollTopPos == 0,
    };

    // console.log(JSON.stringify(customUpdateScrollInfo));
    // console.log("ää PRE-RAW: " + thumbVerticalPosRaw);

    // See handle drag.
    if (!this.dragging) {
      // add scroll delta
      let deltaScrollY =
        this.viewPort.scrollTop - this.nativeScrollStatus.scrollTop;

      const dir = scrollDelta;

      // console.log("DELTA: " + deltaScrollY);

      if (scrollDelta) {
        thumbVerticalPosRaw += this.scrollSpeed * dir;
      }
    }
    const finalThumbVerticalY = this.clamp(
      thumbVerticalPosRaw,
      thumbMinPos,
      thumbMaxPos
    );

    const thumbVerticalStyle: CSSProperties = {
      height: thumbVerticalHeight,
      transition: "transform ease-out 0.1s",
      transform: `translateY(${finalThumbVerticalY}px)`,
    };

    this.fakeScrollTop = this.getScrollTopForOffset(finalThumbVerticalY);

    // console.log("Updated scroll pos: " + finalThumbVerticalY);

    let updateResult: ScrollUpdateArgs = {
      nativeScrollStatus: nativeUpdatedScrollInfo,
      customScrollStatus: customUpdateScrollInfo,
    };

    if (hideTracksWhenNotNeeded) {
      const trackHorizontalStyle = {
        visibility: scrollWidth > clientWidth ? "visible" : "hidden",
      };
      const trackVerticalStyle = {
        visibility: scrollHeight > clientHeight ? "visible" : "hidden",
      };
      css(this.trackHorizontal, trackHorizontalStyle);
      css(this.trackVertical, trackVerticalStyle);
    }
    css(this.thumbHorizontal, thumbHorizontalStyle);
    css(this.thumbVertical, thumbVerticalStyle);

    // if (onUpdate) onUpdate(values);
    if (typeof callback !== "function") return;
    callback(updateResult);
    // }

    // // if (onUpdate) onUpdate(values);
    // if (typeof callback !== "function") return;
    // callback(update);
  }

  updateScrollBarStyle(updatedScrollStatus: ScrollInfo) {}

  render() {
    // const scrollbarWidth = getScrollbarWidth();
    /* eslint-disable no-unused-vars */
    const {
      onScroll,
      onScrollFrame,
      onScrollStart,
      onScrollStop,
      onUpdate,
      renderView,
      renderTrackHorizontal,
      renderTrackVertical,
      renderThumbHorizontal,
      renderThumbVertical,
      tagName,
      hideTracksWhenNotNeeded,
      autoHide,
      autoHideTimeout,
      autoHideDuration,
      thumbSize,
      thumbMinSize,
      universal,
      autoHeight,
      autoHeightMin,
      autoHeightMax,
      style,
      children,
      height,
      width,
      ref,
      scrollbarWidth,
      ...props
    } = this.props;
    /* eslint-enable no-unused-vars */

    const { didMountUniversal } = this.state;

    if (props.virtualizedScrollHeight && this.virtualizedHeight == 0) {
      this.virtualizedHeight = props.virtualizedScrollHeight;
    }

    const containerStyle: React.CSSProperties = {
      ...containerStyleDefault,
      ...(autoHeight && {
        ...containerStyleAutoHeight,
        minHeight: autoHeightMin,
        maxHeight: autoHeightMax,
      }),
      ...style,
      height: "100%",
      width: "100%",
    };

    const viewStyle = {
      ...viewStyleDefault,
      // Hide scrollbars by setting a negative margin
      marginRight: scrollbarWidth ? -scrollbarWidth : 0,
      marginBottom: scrollbarWidth ? -scrollbarWidth : 0,
      ...(autoHeight && {
        ...viewStyleAutoHeight,
        // Add scrollbarWidth to autoHeight in order to compensate negative margins
        minHeight: isString(autoHeightMin)
          ? `calc(${autoHeightMin} + ${scrollbarWidth}px)`
          : autoHeightMin + scrollbarWidth,
        maxHeight: isString(autoHeightMax)
          ? `calc(${autoHeightMax} + ${scrollbarWidth}px)`
          : autoHeightMax + scrollbarWidth,
      }),
      // Override min/max height for initial universal rendering
      ...(autoHeight &&
        universal &&
        !didMountUniversal && {
          minHeight: autoHeightMin,
          maxHeight: autoHeightMax,
        }),
      // Override
      ...(universal && !didMountUniversal && viewStyleUniversalInitial),
    };

    const trackAutoHeightStyle = {
      transition: `opacity ${autoHideDuration}ms`,
      opacity: 0,
    };

    const trackHorizontalStyle = {
      ...trackHorizontalStyleDefault,
      ...(autoHide && trackAutoHeightStyle),
      ...((!scrollbarWidth || (universal && !didMountUniversal)) && {
        display: "none",
      }),
    };

    const trackVerticalStyle = {
      ...trackVerticalStyleDefault,
      ...(autoHide && trackAutoHeightStyle),
      ...((!scrollbarWidth || (universal && !didMountUniversal)) && {
        display: "none",
      }),
    };

    let listViewPortElement = createElement("div", {
      id: "list-viewport",
      // className,
      ref: (element: HTMLElement) => {
        this.viewPort = element;
      },
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: scrollbarWidth, //-17,
        // overflow: "scroll",
        overflow: "clip",
        // WebkitOverflowScrolling: "touch",
        willChange: "transform",
        direction: "ltr",
        ...style,
      },

      children: children,
      // <div style={{ height: "100%", overflow: "clip" }}>
      // { children },
      // </div>
      // children,
    });

    return createElement(
      tagName,
      {
        id: "scrollbar-container",
        ...props,
        style: containerStyle,
        ref: (ref: Element) => {
          this.container = ref;
        },
      },
      [
        listViewPortElement,
        cloneElement(
          renderTrackHorizontal({ style: trackHorizontalStyle }),
          {
            key: "trackHorizontal",
            ref: (ref: HTMLElement) => {
              this.trackHorizontal = ref;
            },
          },
          cloneElement(
            renderThumbHorizontal({ style: thumbHorizontalStyleDefault }),
            {
              ref: (ref: HTMLElement) => {
                this.thumbHorizontal = ref;
              },
            }
          )
        ),
        cloneElement(
          renderTrackVertical({ style: trackVerticalStyle }),
          {
            key: "trackVertical",
            ref: (ref: HTMLElement) => {
              this.trackVertical = ref;
            },
          },
          cloneElement(
            renderThumbVertical({ style: thumbVerticalStyleDefault }),
            {
              ref: (ref: HTMLElement) => {
                this.thumbVertical = ref;
              },
            }
          )
        ),
      ]
    );
  }
}

Scrollbar.defaultProps = {
  renderView: renderViewDefault,
  renderTrackHorizontal: renderTrackHorizontalDefault,
  renderTrackVertical: renderTrackVerticalDefault,
  renderThumbHorizontal: renderThumbHorizontalDefault,
  renderThumbVertical: renderThumbVerticalDefault,
  tagName: "div",
  thumbMinSize: 30,
  hideTracksWhenNotNeeded: false,
  autoHide: false,
  autoHideTimeout: 1000,
  autoHideDuration: 200,
  autoHeight: false,
  autoHeightMin: 0,
  autoHeightMax: 200,
  scrollToOffset: null,
  universal: false,
};

export type ScrollbarProps = typeof Scrollbar.defaultProps &
  PropTypes.InferProps<typeof propTypes>;
const rowHeights: Map<number, number> = new Map();
