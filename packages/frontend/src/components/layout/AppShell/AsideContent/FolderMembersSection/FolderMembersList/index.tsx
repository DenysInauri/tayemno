import { useRef } from "react";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IFolderMemberItem } from "@tayemno/shared";
import type { IDecryptedAncestor } from "../../../../../../api/hooks/useDecryptAncestorFolderNames";
import { FolderMemberRow } from "../FolderMemberRow";
import classes from "./index.module.css";

const ROW_HEIGHT = 64;

interface IProps {
  members: IFolderMemberItem[];
  currentUserId: string;
  ancestorMap: Record<string, IDecryptedAncestor>;
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMembersList = ({
  members,
  currentUserId,
  ancestorMap,
  onRevoke,
}: IProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div
      ref={parentRef}
      className={classes.scrollContainer}
    >
      <Table striped highlightOnHover>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: "none" }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const member = members[virtualRow.index];
            return (
              <FolderMemberRow
                key={member.userId}
                member={member}
                isCurrentUser={member.userId === currentUserId}
                ancestor={ancestorMap[member.userId]}
                onRevoke={onRevoke}
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td
                style={{ height: paddingBottom, padding: 0, border: "none" }}
              />
            </tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
};
