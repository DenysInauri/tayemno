import { Loader } from "@mantine/core";
import type { RenderTreeNodePayload } from "@mantine/core";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { PLACEHOLDER_PREFIX } from "../../../../api/hooks/useLazyFolderTree";
import classes from "./index.module.css";

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
        className={classes.placeholder}
      >
        <Loader size={14} />
      </div>
    );
  }

  return (
    <div
      {...elementProps}
      className={`${classes.node} ${elementProps.className ?? ""}`}
      data-disabled={disabled || undefined}
      style={elementProps.style}
      onClick={(e) => {
        if (hasChildren && !expanded && node.value !== ROOT_VALUE) {
          onExpand(node.value);
        }
        elementProps.onClick(e);
      }}
    >
      {hasChildren &&
        (expanded ? (
          <IconChevronDown size={14} className={classes.chevron} />
        ) : (
          <IconChevronRight size={14} className={classes.chevron} />
        ))}
      {expanded ? (
        <IconFolderOpen size={16} className={classes.folderIcon} />
      ) : (
        <IconFolder size={16} className={classes.folderIcon} />
      )}
      <span>{node.label}</span>
    </div>
  );
};
