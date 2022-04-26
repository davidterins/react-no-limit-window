import PropTypes from "prop-types";

export const propTypes = {
  onScroll: PropTypes.func,
  onScrollFrame: PropTypes.func,
  onScrollStart: PropTypes.func,
  onScrollStop: PropTypes.func,
  onUpdate: PropTypes.func,
  renderView: PropTypes.func,
  renderTrackHorizontal: PropTypes.func,
  renderTrackVertical: PropTypes.func,
  renderThumbHorizontal: PropTypes.func,
  renderThumbVertical: PropTypes.func,
  tagName: PropTypes.string,
  thumbSize: PropTypes.number,
  thumbMinSize: PropTypes.number,
  hideTracksWhenNotNeeded: PropTypes.bool,
  autoHide: PropTypes.bool,
  autoHideTimeout: PropTypes.number,
  autoHideDuration: PropTypes.number,
  autoHeight: PropTypes.bool,
  autoHeightMin: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  autoHeightMax: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  universal: PropTypes.bool,
  style: PropTypes.object,
  children: PropTypes.node,
  virtualizedScrollHeight: PropTypes.number,
  height: PropTypes.number,
  width: PropTypes.number,
  scrollbarWidth: PropTypes.number,
  ref: PropTypes.oneOfType([
    // Either a function
    PropTypes.func,
    // Or the instance of a DOM native element (see the note about SSR)
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};
