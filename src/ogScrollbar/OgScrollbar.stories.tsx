import React, { CSSProperties, FC } from "react";
import { Story, Meta } from "@storybook/react";
import Scrollbars from "react-custom-scrollbars";

const containerStyle: CSSProperties = {
  height: 500,
  width: "100%",
  display: "inline-block",
  background: "gray",
};

const OGScrollBarTest: FC = () => {
  return (
    <div style={containerStyle}>
      <Scrollbars>
        <div style={{ height: 100000000, width: "100%" }}>hej</div>
        <div>då</div>
      </Scrollbars>
    </div>
  );
};

export default {
  title: "Marbella/Original Controls",
  component: OGScrollBarTest,
  argTypes: {},
} as Meta<typeof OGScrollBarTest>;

const Template: Story = (args) => <OGScrollBarTest {...args} />;

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
