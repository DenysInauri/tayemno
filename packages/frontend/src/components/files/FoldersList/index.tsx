import { useNavigate } from "react-router-dom";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folders: Folder[];
}

export const FoldersList = ({ folders }: IProps) => {
  const navigate = useNavigate();

  return (
    <>
      {folders.map((folder) => (
        <FileListItem
          key={folder.id}
          name={folder.name}
          isFolder
          updatedAt={folder.updatedAt}
          onClick={() =>
            navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
          }
        />
      ))}
    </>
  );
};
