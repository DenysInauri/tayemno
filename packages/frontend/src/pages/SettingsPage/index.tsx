import { useTranslation } from "react-i18next";

import { Title } from "../../components/ui/Title";

export const SettingsPage = () => {
  const { t } = useTranslation();

  return <Title>{t("settings.title")}</Title>;
};
