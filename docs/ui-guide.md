# UI Guide

## Folder Convention

Every component and page lives in a folder named after itself, with the implementation in `index.tsx`:

```
components/ui/Button/index.tsx
pages/RegisterPage/index.tsx
```

This allows tests, styles, and other related files to sit alongside the component in the same folder.

## Wrapper Pattern

All UI wrappers use the same pattern: import the Mantine component aliased, create an `IProps` interface extending the Mantine props type, and export an arrow function component:

```tsx
import { ReactNode } from "react";
import { Text as MantineText, TextProps } from "@mantine/core";

interface IProps extends TextProps {
  children?: ReactNode;
}

export const Text = (props: IProps) => <MantineText {...props} />;
```

### Why Not Re-exports

Simple re-exports like `export { Button } from "@mantine/core"` cause WebStorm to suggest simplifying imports directly from `@mantine/core`, bypassing the wrapper. The `IProps` interface pattern avoids this.

### Adding `children` and HTML Attributes

Mantine v7 factory components don't include `children` in their exported props types. Add `children?: ReactNode` explicitly in the interface. For components that need HTML element attributes (like `type` on Button), add those as well:

```tsx
interface IProps extends ButtonProps {
  children?: ReactNode;
  type?: "submit" | "button" | "reset";
}
```

### Polymorphic Components (Anchor)

For polymorphic components that accept a `component` prop, use `ElementType` and cast the spread to avoid type conflicts:

```tsx
import { ElementType, ReactNode } from "react";
import { Anchor as MantineAnchor, AnchorProps } from "@mantine/core";

interface IProps extends AnchorProps {
  children?: ReactNode;
  component?: ElementType;
  type?: string;
}

export const Anchor = (props: IProps) => (
  <MantineAnchor {...(props as AnchorProps)} />
);
```

### Components Without `children`

For input components that don't render children, `IProps` can extend the Mantine props type directly:

```tsx
import { TextInput as MantineTextInput, TextInputProps } from "@mantine/core";

interface IProps extends TextInputProps {}

export const TextInput = (props: IProps) => <MantineTextInput {...props} />;
```

## SizeEnum

All numeric spacing, padding, and margin values in JSX must use `SizeEnum` instead of magic numbers:

```tsx
import { SizeEnum } from "../../enums/ui/SizeEnum";

// Instead of:
<Container py={40}>
<Paper p={30} mt={30}>
<Text mt={5}>

// Use:
<Container py={SizeEnum.XL}>
<Paper p={SizeEnum.LG} mt={SizeEnum.LG}>
<Text mt={SizeEnum.XS}>
```

| Name | Value | Typical Use |
|------|-------|-------------|
| `XS` | 5     | Small gaps, minor spacing |
| `SM` | 10    | Default small spacing |
| `MD` | 20    | Medium spacing |
| `LG` | 30    | Large padding/margins, card padding |
| `XL` | 40    | Page-level vertical padding |

String-based Mantine size tokens (`"xs"`, `"sm"`, `"md"`, `"xl"`) are still used for component-level sizing (e.g., `mt="xl"` on a `Button`). `SizeEnum` is strictly for numeric layout values.
