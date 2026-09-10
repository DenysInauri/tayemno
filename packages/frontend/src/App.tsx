import {
  Container,
  Title,
  Text,
  Paper,
  Badge,
  Group,
  Stack,
} from "@mantine/core";
import type { User } from "@tayemno/shared";

export function App() {
  const user: Pick<User, "name" | "email" | "username"> = {
    username: "testuser",
    email: "test@tayemno.com",
    name: "Test User",
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={1}>Tayemno</Title>
        <Paper shadow="xs" p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text fw={500}>{user.name}</Text>
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            </div>
            <Badge color="green">Active</Badge>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
}
