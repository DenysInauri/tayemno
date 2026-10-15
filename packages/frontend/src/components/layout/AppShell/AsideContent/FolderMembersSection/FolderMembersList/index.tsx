import { useRef } from "react";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IFolderMemberItem } from "@tayemno/shared";
import { FolderMemberRow } from "../FolderMemberRow";

const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 5;

interface IProps {
  members: IFolderMemberItem[];
  currentUserId: string;
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMembersList = ({ members, currentUserId, onRevoke }: IProps) => {
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
      style={{
        height: ROW_HEIGHT * VISIBLE_ROWS,
        overflow: "auto",
      }}
    >
      <Table striped highlightOnHover>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: "none" }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => (
            <FolderMemberRow
              key={members[virtualRow.index].userId}
              member={members[virtualRow.index]}
              isCurrentUser={members[virtualRow.index].userId === currentUserId}
              onRevoke={onRevoke}
            />
          ))}
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
