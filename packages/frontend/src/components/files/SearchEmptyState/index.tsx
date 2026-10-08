import { useTranslation } from "react-i18next";
import { IconSearch } from "@tabler/icons-react";

import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { SizeEnum } from "../../../enums/ui/SizeEnum";

export const SearchEmptyState = () => {
  const { t } = useTranslation();

  return (
    <Stack align="center" justify="center" mih="50vh" gap={SizeEnum.MD}>
      <IconSearch size={48} color="var(--mantine-color-dimmed)" />
      <Text c="dimmed">{t("files.emptySearch.title")}</Text>
    </Stack>
  );
};
