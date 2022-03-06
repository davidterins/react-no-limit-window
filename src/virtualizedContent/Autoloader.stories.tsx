import React from "react";
import { Story, Meta } from "@storybook/react";
import {
  AutoLoaderList,
  AutoLoaderListProps,
} from "../no-limit-list/AutoLoader";
import { PageCollection } from "../paging/PageCollection";

export default {
  title: "Marbella/AutoLoaderList",
  component: AutoLoaderList,
  argTypes: {},
} as Meta<typeof AutoLoaderList>;

const pageCollection = new PageCollection();
const itemCount = 1000000;

const Template: Story = (args) => (
  <AutoLoaderList
    pageCollection={pageCollection}
    itemCount={itemCount}
    {...(args as AutoLoaderListProps)}
  />
);

export const Primary = Template.bind({});

Primary.args = {
  pageCollection: pageCollection,
  itemCount: itemCount,
};
