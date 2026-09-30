import { useTranslation } from "react-i18next";
import { IconDeviceDesktop } from "@tabler/icons-react";

import { Stack } from "../../ui/Stack";
import { Title } from "../../ui/Title";
import { Text } from "../../ui/Text";
import { SizeEnum } from "../../../enums/ui/SizeEnum";

export const MobileBlockScreen = () => {
  const { t } = useTranslation();

  return (
    <Stack align="center" justify="center" h="100dvh" p={SizeEnum.LG}>
      <IconDeviceDesktop size={64} stroke={1.5} color="var(--mantine-color-dimmed)" />
      <Title order={3} ta="center">
        {t("mobile.title")}
      </Title>
      <Text c="dimmed" ta="center">
        {t("mobile.subtitle")}
      </Text>
    </Stack>
  );
};
