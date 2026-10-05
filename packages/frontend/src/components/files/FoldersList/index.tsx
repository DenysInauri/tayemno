import type { ILocalFolder } from "../../../types/local";

import { FolderListItem } from "../FolderListItem";

interface IProps {
  folders: ILocalFolder[];
}

export const FoldersList = ({ folders }: IProps) => (
  <>
    {folders.map((folder) => (
      <FolderListItem key={folder.id} folder={folder} />
    ))}
  </>
);
