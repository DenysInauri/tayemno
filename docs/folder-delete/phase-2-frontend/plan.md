# Phase 2 — Frontend: Delete Folder UI

**Size/shape:** 4 files created, 2 files modified. Small phase.

**Why this approach is sufficient:** The `useDeleteVault` hook is the direct sibling for `useDeleteFolder`. The `CreateFolderModal` is the direct sibling for `DeleteFolderModal` (same Formik + Yup + Mantine Modal pattern). FolderListItem just needs the same Menu + actions pattern that VaultListItem already uses. No new UI components, no new libraries, no new patterns beyond what already exists.

---

## Steps

### Step 1 — Create `deleteFolderConfirmSchema` validation

**New file:** `packages/frontend/src/validations/deleteFolderConfirmSchema/index.ts`

Follow the same structure as `validations/createFolderSchema/index.ts`. The schema validates that the user typed exactly "delete":

```ts
import * as yup from "yup";

export const deleteFolderConfirmSchema = yup.object().shape({
  confirm: yup
    .string()
    .trim()
    .required("files.deleteFolder.validation.confirmRequired")
    .oneOf(["delete"], "files.deleteFolder.validation.confirmMismatch"),
});
```

### Step 2 — Add i18n keys for the delete folder modal

**File:** `packages/frontend/src/i18n/locales/en.json`

Add a `deleteFolder` section inside the existing `files` object (after `uploadFile`), and add validation keys:

```json
"deleteFolder": {
  "title": "Delete this folder?",
  "description": "Deleting the folder <strong>{{folderName}}</strong> and all the files within it is permanent and cannot be undone.",
  "confirmInstruction": "Type in <code>delete</code> to confirm.",
  "fields": {
    "confirm": {
      "placeholder": "Type delete to confirm"
    }
  },
  "submit": "Delete",
  "cancel": "Cancel",
  "validation": {
    "confirmRequired": "Please type \"delete\" to confirm",
    "confirmMismatch": "Please type \"delete\" to confirm"
  }
}
```

Also add to the existing `validation` section inside `files`:

```json
"validation": {
  "folderNameRequired": "Folder name is required",
  "fileRequired": "Please select a file",
  "confirmDeleteRequired": "Please type \"delete\" to confirm"
}
```

Note: The `description` uses `<strong>` and `<code>` tags. These will be rendered via React's `dangerouslySetInnerHTML` or react-i18next's `Trans` component. **Decision point:** Check if the project already uses `Trans` from react-i18next anywhere. If yes, use `Trans` with `components` prop. If no, use `t()` with `{ folderName }` interpolation and render the bold part via a `Text` component with `fw={700}` inline. The executing session should check this and pick accordingly.

### Step 3 — Create `useDeleteFolder` hook

**New file:** `packages/frontend/src/api/hooks/useDeleteFolder/index.ts`

Follow the exact pattern of `api/hooks/useDeleteVault/index.ts`:

```ts
import { useQueryClient } from "@tanstack/react-query";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import { useApiDelete } from "../useApiDelete";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useDeleteFolder = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  const mutation = useApiDelete<IDeleteFolderResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/${folderId}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_SIZE] });
      },
    },
  );

  return { deleteFolder: mutation.mutate, isDeleting: mutation.isPending };
};
```

Key difference from `useDeleteVault`: folder endpoints are nested under `/workspaces/:workspaceId/folders/:folderId`, so the URL must include `workspace.id`. This matches how `useGetFolders` constructs its URL (`useGetFolders/index.ts:23-25`).

### Step 4 — Create `DeleteFolderModal` component

**New file:** `packages/frontend/src/components/files/DeleteFolderModal/index.tsx`

Follow the structure of `CreateFolderModal/index.tsx` but adapted for deletion confirmation. Key differences:
- Input is for typing "delete", not a folder name
- Has two buttons: Cancel (white/default variant) and Delete (red)
- Shows warning text about permanent deletion
- Delete button is disabled until input matches "delete"

```tsx
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";

import { Modal } from "../../ui/Modal";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { deleteFolderConfirmSchema } from "../../../validations/deleteFolderConfirmSchema";

interface IProps {
  opened: boolean;
  folderName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface IDeleteFolderFormValues {
  confirm: string;
}

export const DeleteFolderModal = ({
  opened,
  folderName,
  isDeleting,
  onClose,
  onConfirm,
}: IProps) => {
  const { t } = useTranslation();

  const formik = useFormik<IDeleteFolderFormValues>({
    initialValues: { confirm: "" },
    validationSchema: deleteFolderConfirmSchema,
    validateOnChange: true,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: (_values, { resetForm }) => {
      onConfirm();
      resetForm();
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.deleteFolder.title")}
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack>
          <Text size="sm">
            {t("files.deleteFolder.description", { folderName })}
          </Text>
          <Text size="sm">
            {t("files.deleteFolder.confirmInstruction")}
          </Text>
          <TextInput
            data-autofocus
            placeholder={t("files.deleteFolder.fields.confirm.placeholder")}
            name="confirm"
            value={formik.values.confirm}
            onChange={formik.handleChange}
            error={
              formik.touched.confirm &&
              formik.errors.confirm &&
              t(formik.errors.confirm)
            }
          />
          <Group justify="space-between">
            <Button variant="default" onClick={handleClose}>
              {t("files.deleteFolder.cancel")}
            </Button>
            <Button
              type="submit"
              color="red"
              loading={isDeleting}
              disabled={formik.values.confirm.trim() !== "delete"}
            >
              {t("files.deleteFolder.submit")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
```

**Note on the description text with bold folder name:** The simplest approach matching the screenshot is to split the text into parts using i18n interpolation and render the folder name in a `<Text span fw={700}>` inline. The executing session should decide the cleanest approach based on what the codebase already does. If the codebase uses `Trans` component, use that. Otherwise, simple string interpolation with `{{ folderName }}` is fine and the bold styling can be skipped or achieved by splitting the text around the interpolation.

### Step 5 — Update `FolderListItem` to add delete action

**File:** `packages/frontend/src/components/files/FolderListItem/index.tsx`

Add a Menu with a delete action (same pattern as VaultListItem), plus state management for the confirmation modal.

```tsx
// BEFORE:
import { useNavigate } from "react-router-dom";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { useGetFolderSize } from "../../../api/hooks/useGetFolderSize";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folder: Folder;
}

export const FolderListItem = ({ folder }: IProps) => {
  const navigate = useNavigate();
  const { data } = useGetFolderSize(folder.id);

  return (
    <FileListItem
      name={folder.name}
      isFolder
      sizeBytes={data?.sizeBytes}
      encryptedSizeBytes={data?.encryptedSizeBytes}
      updatedAt={folder.updatedAt}
      onClick={() =>
        navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
      }
    />
  );
};

// AFTER:
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { DeleteFolderModal } from "../DeleteFolderModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useGetFolderSize } from "../../../api/hooks/useGetFolderSize";
import { useDeleteFolder } from "../../../api/hooks/useDeleteFolder";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folder: Folder;
}

export const FolderListItem = ({ folder }: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useGetFolderSize(folder.id);
  const { deleteFolder, isDeleting } = useDeleteFolder(folder.id);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure();

  return (
    <>
      <FileListItem
        name={folder.name}
        isFolder
        sizeBytes={data?.sizeBytes}
        encryptedSizeBytes={data?.encryptedSizeBytes}
        updatedAt={folder.updatedAt}
        onClick={() =>
          navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
        }
        actions={
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={isDeleting}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={openDeleteModal}
              >
                {t("files.actions.delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      <DeleteFolderModal
        opened={deleteModalOpened}
        folderName={folder.name}
        isDeleting={isDeleting}
        onClose={closeDeleteModal}
        onConfirm={() => deleteFolder()}
      />
    </>
  );
};
```

---

## Files Changed Summary

| Action | File |
|--------|------|
| Create | `packages/frontend/src/validations/deleteFolderConfirmSchema/index.ts` |
| Edit | `packages/frontend/src/i18n/locales/en.json` — add deleteFolder keys |
| Create | `packages/frontend/src/api/hooks/useDeleteFolder/index.ts` |
| Create | `packages/frontend/src/components/files/DeleteFolderModal/index.tsx` |
| Edit | `packages/frontend/src/components/files/FolderListItem/index.tsx` — add Menu + modal |
