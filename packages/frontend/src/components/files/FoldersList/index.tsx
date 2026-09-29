import type { Folder } from "@tayemno/shared";

import { FolderListItem } from "../FolderListItem";

interface IProps {
  folders: Folder[];
}

export const FoldersList = ({ folders }: IProps) => (
  <>
    {folders.map((folder) => (
      <FolderListItem key={folder.id} folder={folder} />
    ))}
  </>
);
