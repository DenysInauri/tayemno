import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { IBreadcrumbItem } from "@tayemno/shared";

import { Breadcrumbs } from "../../ui/Breadcrumbs";
import { Anchor } from "../../ui/Anchor";
import { Text } from "../../ui/Text";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  breadcrumbs: IBreadcrumbItem[];
}

export const FolderBreadcrumbs = ({ breadcrumbs }: IProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Breadcrumbs>
      <Anchor
        size="sm"
        component="button"
        type="button"
        onClick={() => navigate(RouteEnum.HOME)}
      >
        {t("files.breadcrumb.root")}
      </Anchor>
      {breadcrumbs.map((crumb, index) =>
        index < breadcrumbs.length - 1 ? (
          <Anchor
            key={crumb.id}
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(`/folders/${crumb.id}`)}
          >
            {crumb.name}
          </Anchor>
        ) : (
          <Text key={crumb.id} size="sm">
            {crumb.name}
          </Text>
        ),
      )}
    </Breadcrumbs>
  );
};
