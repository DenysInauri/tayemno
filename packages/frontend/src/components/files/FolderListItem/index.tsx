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
