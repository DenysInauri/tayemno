export interface IFolderNode {
  name: string;
  files: File[];
  children: IFolderNode[];
}

export const buildFolderTree = (files: FileList): IFolderNode => {
  const root: IFolderNode = { name: "", files: [], children: [] };

  for (const file of Array.from(files)) {
    const parts = file.webkitRelativePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      let child = current.children.find((c) => c.name === parts[i]);

      if (!child) {
        child = { name: parts[i], files: [], children: [] };
        current.children.push(child);
      }

      current = child;
    }

    current.files.push(file);
  }

  return root.children[0];
};
