import {
  AppShell as MantineAppShell,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";

import { useAuth } from "../../../../contexts/AuthContext";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";
import classes from "./index.module.css";

export const HeaderContent = () => {
  const { user, workspaceName, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <MantineAppShell.Header>
      <Group className={classes.headerGroup}>
        <Text className={classes.workspaceName}>{workspaceName}</Text>

        <Menu position="bottom-end">
          <Menu.Target>
            <UnstyledButton className={classes.displayName}>
              <Group className={classes.userGroup}>
                <Text className={classes.userName}>{user.name}</Text>
                <IconChevronDown size={14} />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconSettings size={16} />}
              onClick={() => navigate(RouteEnum.SETTINGS)}
            >
              {t("nav.settings")}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={signOut}
            >
              {t("nav.signOut")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </MantineAppShell.Header>
  );
};
