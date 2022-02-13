import React from "react";
import { Story, Meta } from "@storybook/react";
import VirtualizedContent from "./VirtualizedContent";

export default {
  title: "Marbella/Virtualized",
  component: VirtualizedContent,
  argTypes: {},
} as Meta<typeof VirtualizedContent>;

const Template: Story = (args) => <VirtualizedContent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  primary: true,
  disabled: false,
  text: "Primary",
};

export const Disabled = Template.bind({});
Disabled.args = {
  primary: false,
  disabled: true,
  text: "Disabled",
};
