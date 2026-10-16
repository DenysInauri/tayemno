import { useTranslation } from "react-i18next";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Group } from "../../../ui/Group";
import { Text } from "../../../ui/Text";
import { ActionIcon } from "../../../ui/ActionIcon";
import classes from "./index.module.css";

interface IProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export const PreviewFooter = ({
  currentIndex,
  total,
  onPrev,
  onNext,
}: IProps) => {
  const { t } = useTranslation();

  if (total <= 1) return null;

  return (
    <Group
      justify="center"
      gap="md"
      px="md"
      py="xs"
      className={classes.container}
    >
      <ActionIcon variant="subtle" color="gray" onClick={onPrev}>
        <IconChevronLeft size={18} />
      </ActionIcon>
      <Text size="sm" c="dimmed">
        {t("preview.counter", {
          current: currentIndex + 1,
          total,
        })}
      </Text>
      <ActionIcon variant="subtle" color="gray" onClick={onNext}>
        <IconChevronRight size={18} />
      </ActionIcon>
    </Group>
  );
};
