import { useRef } from "react";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import type { IMemberItem } from "@tayemno/shared";
import { MemberRow } from "./MemberRow";

const ROW_HEIGHT = 48;

interface IProps {
  members: IMemberItem[];
  currentUserId: string;
  onReinvite: (member: IMemberItem) => void;
  onDelete: (member: IMemberItem) => void;
}

export const UsersTable = ({
  members,
  currentUserId,
  onReinvite,
  onDelete,
}: IProps) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div ref={parentRef} style={{ flex: 1, overflow: "auto" }}>
      <Table striped highlightOnHover>
        <Table.Thead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "var(--mantine-color-body)",
          }}
        >
          <Table.Tr>
            <Table.Th>{t("users.columns.name")}</Table.Th>
            <Table.Th>{t("users.columns.email")}</Table.Th>
            <Table.Th>{t("users.columns.role")}</Table.Th>
            <Table.Th>{t("users.columns.status")}</Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: "none" }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => (
            <MemberRow
              key={members[virtualRow.index].id}
              member={members[virtualRow.index]}
              currentUserId={currentUserId}
              onReinvite={onReinvite}
              onDelete={onDelete}
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
