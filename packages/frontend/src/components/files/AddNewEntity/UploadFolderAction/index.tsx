import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconFolderUp } from "@tabler/icons-react";
import { Button } from "../../../ui/Button";
import { useUpload } from "../../../../contexts/UploadContext";

interface IProps {
  folderId: string | null;
}

export const UploadFolderAction = ({ folderId }: IProps) => {
  const { t } = useTranslation();
  const { uploadFolder } = useUpload();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    uploadFolder(files, folderId);
    e.target.value = "";
  };

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconFolderUp size={16} />}
        onClick={() => folderInputRef.current?.click()}
      >
        {t("files.uploadFolderButton")}
      </Button>
      <input
        ref={folderInputRef}
        type="file"
        onChange={handleFolderChange}
        style={{ display: "none" }}
        {...{ webkitdirectory: "", directory: "" }}
      />
    </>
  );
};
