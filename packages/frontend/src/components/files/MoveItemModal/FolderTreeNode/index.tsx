import { Loader } from "@mantine/core";
import type { RenderTreeNodePayload } from "@mantine/core";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { PLACEHOLDER_PREFIX } from "../../../../api/hooks/useLazyFolderTree";

const ROOT_VALUE = "root";

interface IProps extends RenderTreeNodePayload {
  disabled: boolean;
  onExpand: (nodeValue: string) => void;
}

export const FolderTreeNode = ({
  node,
  hasChildren,
  expanded,
  elementProps,
  disabled,
  onExpand,
}: IProps) => {
  if (node.value.startsWith(PLACEHOLDER_PREFIX)) {
    return (
      <div
        {...elementProps}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4 }}
      >
        <Loader size={14} />
      </div>
    );
  }

  return (
    <div
      {...elementProps}
      onClick={(e) => {
        if (hasChildren && !expanded && node.value !== ROOT_VALUE) {
          onExpand(node.value);
        }
        elementProps.onClick(e);
      }}
      style={{
        ...elementProps.style,
        display: "flex",
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {hasChildren &&
        (expanded ? (
          <IconChevronDown size={14} style={{ marginRight: 4 }} />
        ) : (
          <IconChevronRight size={14} style={{ marginRight: 4 }} />
        ))}
      {expanded ? (
        <IconFolderOpen size={16} style={{ marginRight: 6 }} />
      ) : (
        <IconFolder size={16} style={{ marginRight: 6 }} />
      )}
      <span>{node.label}</span>
    </div>
  );
};
