import React from "react";
// @ts-ignore
import SimpleDecorator from "draft-js-simpledecorator";
import { Fragmenter } from "./fragments";
import { ContentBlock } from "draft-js";

function escapeRegExp(s: string) {
  return s.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

function getProperties<T extends object>(t: T): T {
  return { ...(t as object) } as T;
}

export interface MultiHighlightStyle {
  [key: string]: string | number;
}

export interface MultiHighlightStyles {
  [key: string]: MultiHighlightStyle;
}

export interface MultiHighlightRule {
  content: string[];
  style: string;
  matcher: Function;
}

export interface MultiHighlightConfig {
  rules: MultiHighlightRule[];
  styles: MultiHighlightStyles;
}

export function WordMatcher(
  fragmenter: Fragmenter,
  items: string[],
  style: string,
  contentBlock: ContentBlock
) {
  const text = contentBlock.getText();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const regex = new RegExp(`\\b${escapeRegExp(item)}\\b`, "g");
    let matchArr = null;
    while ((matchArr = regex.exec(text)) !== null) {
      const match = matchArr[0];
      const start = matchArr.index;
      const end = start + match.length;
      fragmenter.add(style, [start, end]);
    }
  }
}

export function SentenceMatcher(
  fragmenter: Fragmenter,
  items: string[],
  style: string,
  contentBlock: ContentBlock
) {
  const text = contentBlock.getText();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const start = text.indexOf(item);
    const end = start + item.length;
    if (start === -1) {
      continue;
    }
    fragmenter.add(style, [start, end]);
  }
}

export function MultiHighlightDecorator(config: MultiHighlightConfig) {
  const allowedSpanStyles = [
    "color",
    "backgroundColor",
    "borderBottomWidth",
    "borderBottomColor",
    "borderBottomStyle",
    "display",
  ];
  return new SimpleDecorator(
    function strategy(contentBlock: ContentBlock, callback: Function) {
      const fragments = new Fragmenter(config.styles);
      for (const rule of config.rules) {
        rule.matcher(fragments, rule.content, rule.style, contentBlock);
      }
      if (fragments.isMultiply()) {
        const ranges = fragments.getDecoratedRanges();
        for (const range of ranges) {
          let style = {};
          for (const s of range.styles) {
            style = {
              ...style,
              ...getProperties<MultiHighlightStyle>(config.styles[s]),
            };
          }
          callback(range.range[0], range.range[1], style);
        }
      } else {
        const singleRanges = fragments.getSimpleRanges();
        if (singleRanges) {
          for (const range of singleRanges.range) {
            callback(range[0], range[1], config.styles[singleRanges.style]);
          }
        }
      }
    },

    function component(props: MultiHighlightStyle) {
      const styles: MultiHighlightStyle = {};
      for (const s of allowedSpanStyles) {
        if (props[s] !== undefined) {
          styles[s] = props[s];
        }
      }
      return <span style={styles}>{props.children}</span>;
    }
  );
}
