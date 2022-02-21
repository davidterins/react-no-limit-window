import raf, { cancel as caf } from "raf";
import css from "dom-css";
import PropTypes from "prop-types";
import { Component, createElement, cloneElement, createRef } from "react";
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
import VariableSizeList from "../../virtualized-list/VariableSizeList";
import { propTypes } from "./scrollbar.types";
import { IScrollable } from "../../virtualized-list/createListComponent";

interface State {
  didMountUniversal: boolean;
}

interface ScrollUpdateArgs {
  // TODO: use this in update callback!
  nativeScrollStatus: ScrollStatus;
  customScrollStatus: ScrollStatus;
}

interface ScrollStatus {
  top: number;
  scrollTop: number;
  atBottom: boolean;
  atTop: boolean;
  clientHeight: number; // maxHeight - scrollTop.
  maxHeight: number;
}

export default class Scrollbar extends Component<ScrollbarProps, State> {
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

  prevPageX: number = 0;
  prevPageY: number = 0;

  lastViewScrollLeft: number | undefined;
  viewScrollLeft: number | undefined;
  lastViewScrollTop: number | undefined;
  viewScrollTop: number | undefined;

  requestFrame: number | undefined;

  fakeScrollTop: number = 0;

  nativeScrollStatus: ScrollStatus = {
    top: 0,
    scrollTop: 0,
    clientHeight: 0,
    maxHeight: 0,
    atBottom: false,
    atTop: true,
  };

  customScrollStatus: ScrollStatus = {
    top: 0,
    scrollTop: 0,
    clientHeight: 0,
    maxHeight: 0,
    atBottom: false,
    atTop: true,
  };

  skipNextOnScrollEvent: boolean;

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
    virtualizedScrollHeight: number;
  };
  constructor(props: ScrollbarProps, rest) {
    super(props, rest);
    this.testRef = createRef();
    this.syncScrollStatus = this.syncScrollStatus.bind(this);
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
    this.handleScroll = this.handleScroll.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);

    this.state = {
      didMountUniversal: false,
    };
  }

  componentDidMount() {
    this.addListeners();
    this.update();
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

  getViewPortElementValues() {
    let {
      scrollLeft = 0,
      scrollTop = 0,
      scrollWidth = 0,
      scrollHeight = 0,
      clientWidth = 0,
      clientHeight = 0,
    } = this.viewPort || {};

    console.log("FAKFAKESCROLL: " + this.fakeScrollTop);

    const virtualizedScrollHeight = this.props.virtualizedScrollHeight;
    const customScrollTop = Math.floor(this.fakeScrollTop);

    return {
      left: scrollLeft / (scrollWidth - clientWidth) || 0,
      top: customScrollTop / (virtualizedScrollHeight - clientHeight) || 0,
      scrollLeft,
      customScrollTop, // scroll top of custom scrollbar
      scrollTop, // actual scroll top of div element
      scrollWidth,
      scrollHeight: virtualizedScrollHeight,
      clientWidth,
      clientHeight,
    };

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
    const { clientHeight } = this.viewPort;
    const scrollHeight = this.props.virtualizedScrollHeight;
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

  getScrollTopForOffset(offset: number) {
    const { clientHeight } = this.viewPort;
    const scrollHeight = this.props.virtualizedScrollHeight;
    const trackHeight = getInnerHeight(this.trackVertical);
    const thumbHeight = this.getThumbVerticalHeight();
    const scrollTopOffsetResult =
      (offset / (trackHeight - thumbHeight)) * (scrollHeight - clientHeight);
    // console.log("clientHeight " + clientHeight);
    // console.log("trackHeight " + trackHeight);
    // console.log("offset " + offset);
    // console.log("result " + scrollTopOffsetResult);
    return scrollTopOffsetResult;
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
    view.addEventListener("scroll", this.handleScroll);
    if (!getScrollbarWidth()) return;
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
    view.removeEventListener("scroll", this.handleScroll);
    if (!getScrollbarWidth()) return;
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

  handleScroll(event: Event) {
    if (this.skipNextOnScrollEvent) {
      this.skipNextOnScrollEvent = false;
      return;
    }

    console.log("Handling Scroll!!");
    const { onScroll, onScrollFrame } = this.props;
    if (onScroll) onScroll(event);

    this.update((values) => {
      const { customScrollTop, scrollLeft, scrollTop, scrollHeight } = values;
      this.viewScrollLeft = scrollLeft;
      this.viewScrollTop = customScrollTop;

      this.nativeScrollStatus.scrollTop = scrollTop;

      console.log("scrollheight: " + this.viewPort.scrollHeight);
      console.log("height: " + this.viewPort.clientHeight);
      console.log("offsetHeight: " + this.viewPort.offsetHeight);
      // this.nativeScrollAtBottom =
      //   this.nativeScrollTop + this.viewPort.clientHeight ==
      //   this.viewPort.scrollHeight;

      // console.log("BOTTOM: " + this.nativeScrollAtBottom);

      // if(this.nativeScrollAtBottom && vie)

      this.syncScrollStatus(customScrollTop, scrollTop);

      if (onScrollFrame)
        // Add this to update child view.
        // (this.testRef as IScrollable).Scrolla(
        //   this.viewPort.clientHeight,
        //   scrollHeight,
        //   scrollTop
        // );

        onScrollFrame(values);
    });

    this.detectScrolling();
  }

  // nativeScrollTop: number;
  // nativeScrollAtBottom: boolean;
  // nativeScrollAtTop: boolean;

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
    console.log(`sks: ${clampedScrollPos}, ${thumbMaxPos}`);

    let customAtBottom = clampedScrollPos == thumbMaxPos;

    console.log(`native: ${nativeAtBottom}, custom: ${customAtBottom}`);
  }

  scrollIsAtBottom(
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number
  ) {
    return scrollTop + clientHeight == scrollHeight;
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
    this.update();
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

      // console.log("trackTop: " + trackTop);
      // console.log("mouseDownYPos: " + mouseDownYPos);
      // console.log("clickPos: " + clickPosition);
      // console.log("OFFSET: " + offset);

      // this.viewPort.scrollTop = this.getRandom(); // this.getScrollTopForOffset(offset);
      this.fakeScrollTop = this.getScrollTopForOffset(offset);
      this.forceTriggerNativeScrollEvent();

      console.log("FAKESCROLLTOP: " + this.fakeScrollTop);
      console.log("VIEWSCROLLTOP: " + this.viewPort.scrollTop);
    }
    return false;
  }

  num: 0;
  forceTriggerNativeScrollEvent = () => {
    if (this.num == 0) {
      this.num += 1;
    } else {
      this.num = 0;
    }
    // Setting scrollTop triggers native scroll event.
    this.viewPort.scrollTop = this.num;
    return this.num;
  };

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

  update(callback: (values: any) => void = () => {}) {
    this.raf(() => this._update(callback));
  }

  clamp = (num: number, min: number, max: number) =>
    Math.min(Math.max(num, min), max);

  _update(callback: (values: any) => void) {
    const { onUpdate, hideTracksWhenNotNeeded } = this.props;
    const values = this.getViewPortElementValues();

    if (getScrollbarWidth()) {
      const { scrollLeft, clientWidth, scrollWidth } = values;
      const trackHorizontalWidth = getInnerWidth(this.trackHorizontal);
      const thumbHorizontalWidth = this.getThumbHorizontalWidth();
      const thumbHorizontalX =
        (scrollLeft / (scrollWidth - clientWidth)) *
        (trackHorizontalWidth - thumbHorizontalWidth);
      const thumbHorizontalStyle = {
        width: thumbHorizontalWidth,
        transform: `translateX(${thumbHorizontalX}px)`,
      };

      const { customScrollTop, clientHeight, scrollHeight } = values;

      const trackVerticalHeight = getInnerHeight(this.trackVertical);
      const thumbVerticalHeight = this.getThumbVerticalHeight();

      const thumbMinPos = 0;
      const thumbMaxPos = trackVerticalHeight - thumbVerticalHeight;

      let thumbVerticalPosRaw =
        (customScrollTop / (scrollHeight - clientHeight)) * thumbMaxPos;

      // TODO: calculate fakevalues here then used in update function.
      // See handle drag.
      if (!this.dragging) {
        // add scroll delta
        // let deltaScrollY = this.viewPort.scrollTop - this.nativeScrollTop;
        // thumbVerticalPosRaw += deltaScrollY;
        // this.nativeScrollTop;
        // console.log(
        //   `Handle scrolltop prev: ${this.nativeScrollTop}, new: ${this.viewPort.scrollTop}`
        // );
      }

      const thumbVerticalY = this.clamp(
        thumbVerticalPosRaw,
        thumbMinPos,
        thumbMaxPos
      );

      const thumbVerticalStyle = {
        height: thumbVerticalHeight,
        transform: `translateY(${thumbVerticalY}px)`,
      };

      console.log(
        "Updated scroll with values: " +
          scrollHeight +
          " " +
          trackVerticalHeight +
          " " +
          thumbVerticalHeight
      );
      // (20 / (450000 - 300)) = 0.0004
      // (296 - 30)

      console.log("Updated scroll pos: " + thumbVerticalY);

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
    }
    if (onUpdate) onUpdate(values);
    if (typeof callback !== "function") return;
    callback(values);
  }

  render() {
    const scrollbarWidth = getScrollbarWidth();
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
      ...props
    } = this.props;
    /* eslint-enable no-unused-vars */

    const { didMountUniversal } = this.state;

    const containerStyle: React.CSSProperties = {
      ...containerStyleDefault,
      ...(autoHeight && {
        ...containerStyleAutoHeight,
        minHeight: autoHeightMin,
        maxHeight: autoHeightMax,
      }),
      ...style,
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

    const Row = ({ index, style }: any) => <div style={style}>Row {index}</div>;

    let listViewPortElement = createElement("div", {
      id: "list-viewport",
      // className,
      ref: (element: HTMLElement) => {
        this.viewPort = element;
      },
      style: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 15, // -17,
        overflow: "scroll",
        WebkitOverflowScrolling: "touch",
        willChange: "transform",
        direction: "ltr",
        ...style,
      },
      children: <div style={{ height: "105%" }}></div>,
      // children: (
      //   <VariableSizeList
      //     setRef={(ref) => {
      //       // console.log(ref);
      //       this.testRef = ref;
      //     }}
      //     outerRef={this.viewPort}
      //     height={300} // want this to be only the view
      //     width={"100%"}
      //     itemCount={1000}
      //     itemSize={() => 35}
      //   >
      //     {Row}
      //   </VariableSizeList>
      // ),
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
  universal: false,
  virtualizedScrollHeight: 35000,
};

export type ScrollbarProps = typeof Scrollbar.defaultProps &
  PropTypes.InferProps<typeof propTypes>;
