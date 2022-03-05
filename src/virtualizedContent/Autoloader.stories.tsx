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

const Template: Story = (args) => (
  <AutoLoaderList pageCollection={pageCollection} itemCount={100} {...(args as AutoLoaderListProps)} />
);

export const Primary = Template.bind({});

const pageCollection = new PageCollection();
const itemCount = 1000;

Primary.args = {
  pageCollection: pageCollection,
  itemCount: itemCount,
};
