import { AppShell as MantineAppShell } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Title } from "../../../ui/Title";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";

export const AsideContent = () => {
  const { t } = useTranslation();

  return (
    <MantineAppShell.Aside p={SizeEnum.MD}>
      <MantineAppShell.Section>
        <Title order={4}>{t("aside.title")}</Title>
      </MantineAppShell.Section>
    </MantineAppShell.Aside>
  );
};
