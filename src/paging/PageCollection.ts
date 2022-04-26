import { ListItem } from "../no-limit-list/AutoLoader";
import { Page, PageState } from "./Page";

type Index = number;

export interface IPageCollection<T> {
  readonly pageSize: number;
  getItem: (index: number) => T;
  isItemLoaded: (index: number) => boolean;
  getPageState: (index: number) => PageState;
  loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void>;
}

export class PageCollection implements IPageCollection<ListItem> {
  private pages: Map<Index, Page<ListItem>>;
  public readonly pageSize = 10;

  constructor() {
    this.pages = new Map<Index, Page<ListItem>>();
  }

  public isItemLoaded(itemIndex: Index): boolean {
    let pageIndex = Math.floor(itemIndex / this.pageSize);

    if (!this.pages.has(pageIndex)) {
      return false;
    }

    return this.pages.get(pageIndex).status == "loaded";
  }

  public getPageState(index: number): PageState {
    let pageIndex = this.getItemPageIndex(index);

    if (!this.pages.has(pageIndex)) {
      return "initialized";
    }

    return this.pages.get(pageIndex).status;
  }

  public getItem(index: number) {
    let pageIndex = this.getItemPageIndex(index);
    let pageOffset = index % this.pageSize;

    return this.pages.get(pageIndex).items[pageOffset];
  }

  public loadMoreItems(startIndex: number, stopIndex: number) {
    return this.requestPages(startIndex, stopIndex);
  }

  private async requestPages(startIndex: number, stopIndex: number) {
    let containedPageIndices = new Set<Index>();

    for (let i = startIndex; i < stopIndex; i++) {
      let itemPageIndex = this.getItemPageIndex(i);
      let containingPage = this.getPage(itemPageIndex);
      if (containingPage.status == "initialized") {
        containedPageIndices.add(itemPageIndex);
      }
    }

    // console.log("Request pages", containedPageIndices.keys());
    if (containedPageIndices.size > 0) {
      // console.log("Request fetched11");
      return new Promise<void>(async (resolve, reject) => {
        // console.Console;
        let pageFetchPromises = Array.from(containedPageIndices.keys()).map(
          (pageIndex) => {
            return new Promise<number>((resolve, reject) => {
              setTimeout(() => {
                let fetchingPage = this.pages.get(pageIndex);

                fetchingPage.items = new Array(this.pageSize).fill({
                  content: "hejhej",
                });

                resolve(pageIndex);
              }, 100);
            });
          }
        );

        containedPageIndices.forEach((pageIndex) => {
          this.pages.get(pageIndex).status = "requested";
        });
        let fetchedPageIndices = await Promise.all(pageFetchPromises);
        // console.log("Request fetched", fetchedPageIndices);

        fetchedPageIndices.forEach((pageIndex) => {
          const pageStartIndex = pageIndex * this.pageSize;
          const pageStopIndex = pageStartIndex + this.pageSize - 1;
          console.log(
            `- height loaded page with ${pageStartIndex} -> ${pageStopIndex}`
          );
          this.pages.get(pageIndex).status = "loaded";
        });

        resolve();
      });
    }
  }

  public getPage(pageIndex: Index): Page<ListItem> {
    if (!this.pages.has(pageIndex)) {
      let newPage = this.getNewPage();
      this.pages.set(pageIndex, newPage);
    }

    return this.pages.get(pageIndex);
  }

  private getNewPage(): Page<ListItem> {
    return {
      lastTouchedTime: Date.now(),
      capacity: this.pageSize,
      status: "initialized",
      items: [],
    };
  }

  private getItemPageIndex(itemIndex: number) {
    return Math.floor(itemIndex / this.pageSize);
  }
}
