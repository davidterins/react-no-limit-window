export type PageState = "none" | "initialized" | "requested" | "loaded";
export interface Page<T> {
  lastTouchedTime: number;
  capacity: number;
  status: PageState;
  items: T[];
}
