import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconUpload } from "@tabler/icons-react";
import { Button } from "../../../ui/Button";
import { useUpload } from "../../../../contexts/UploadContext";
import classes from "./index.module.css";

interface IProps {
  folderId: string | null;
}

export const UploadFileActions = ({ folderId }: IProps) => {
  const { t } = useTranslation();
  const { upload } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => upload(file, folderId));
    e.target.value = "";
  };

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconUpload size={16} />}
        onClick={() => fileInputRef.current?.click()}
      >
        {t("files.uploadFileButton")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className={classes.hiddenInput}
      />
    </>
  );
};
