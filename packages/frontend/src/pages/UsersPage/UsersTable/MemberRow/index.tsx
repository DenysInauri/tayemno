import { Table, Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { IMemberItem } from "@tayemno/shared";
import { MemberRowActions } from "../MemberRowActions";

interface IProps {
  member: IMemberItem;
  currentUserId: string;
  onReinvite: (member: IMemberItem) => void;
  onDelete: (member: IMemberItem) => void;
}

export const MemberRow = ({
  member,
  currentUserId,
  onReinvite,
  onDelete,
}: IProps) => {
  const { t } = useTranslation();

  return (
    <Table.Tr key={member.id}>
      <Table.Td>{member.name}</Table.Td>
      <Table.Td>{member.email}</Table.Td>
      <Table.Td>{t(`users.roles.${member.role}`)}</Table.Td>
      <Table.Td>
        <Badge
          color={member.status === "active" ? "green" : "yellow"}
          variant="light"
        >
          {t(`users.status.${member.status}`)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <MemberRowActions
          member={member}
          currentUserId={currentUserId}
          onReinvite={onReinvite}
          onDelete={onDelete}
        />
      </Table.Td>
    </Table.Tr>
  );
};
