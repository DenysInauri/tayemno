import { TextInput as MantineTextInput, TextInputProps } from "@mantine/core";

interface IProps extends TextInputProps {
  successHighlight?: boolean;
}

export const TextInput = ({ successHighlight, styles, ...rest }: IProps) => {
  const mergedStyles = successHighlight
    ? {
        ...styles,
        input: {
          ...(typeof styles === "object" && styles !== null && "input" in styles
            ? ((styles as Record<string, unknown>).input as Record<string, unknown>)
            : {}),
          borderColor: "var(--mantine-color-green-6)",
        },
      }
    : styles;

  return <MantineTextInput styles={mergedStyles} {...rest} />;
};
