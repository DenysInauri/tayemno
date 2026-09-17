# API Guide

## Architecture

Two-layer hook pattern built on Axios + TanStack Query:

```
Layer 1 (generic):   useApiGet / useApiPost / useApiPatch
                          ↑
Layer 2 (specific):  useGetIsUsernameFree, usePostRegister, ...
```

- **Layer 1** — thin wrappers around TanStack Query + Axios. Live in `api/hooks/`.
- **Layer 2** — one hook per API endpoint, built on top of Layer 1. Each knows its URL, types, and default options. Created per-feature as needed.

## Enums

All query keys and endpoint paths are centralized in enums. Never use raw strings for these values.

### QueryKeyEnum

Located at `enums/api/QueryKeyEnum/index.ts`. Every query key used in `useApiGet` must be declared here.

```ts
export enum QueryKeyEnum {
  IS_USERNAME_FREE = "isUsernameFree",
}
```

### EndpointEnum

Located at `enums/api/EndpointEnum/index.ts`. Every API endpoint path must be declared here.

```ts
export enum EndpointEnum {
  CHECK_USERNAME = "/users/check-username",
  REGISTER = "/auth/register",
}
```

## Creating Layer 2 Hooks

### Query hook (GET)

```ts
// api/hooks/useGetIsUsernameFree/index.ts
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

interface IIsUsernameFreeResponse {
  isFree: boolean;
}

export const useGetIsUsernameFree = (username: string) => {
  return useApiGet<IIsUsernameFreeResponse>(
    [QueryKeyEnum.IS_USERNAME_FREE, username],
    `${EndpointEnum.CHECK_USERNAME}/${username}`,
    { enabled: username.length > 0 },
  );
};
```

```tsx
// In a component:
const { data, isLoading } = useGetIsUsernameFree(debouncedUsername);
```

### Mutation hook (POST)

```ts
// api/hooks/usePostRegister/index.ts
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

interface IRegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
}

interface IRegisterResponse {
  userId: string;
  token: string;
}

export const usePostRegister = () => {
  return useApiPost<IRegisterRequest, IRegisterResponse>(EndpointEnum.REGISTER);
};
```

```tsx
// In a component:
const { mutate, isPending } = usePostRegister();

const onSubmit = (values: IRegisterFormValues) => {
  mutate(values, {
    onSuccess: (data) => {
      // handle success
    },
    onError: (error) => {
      // handle error
    },
  });
};
```

## Response parsing with `select` + fallback

`useApiGet` supports a second generic `TData` and TanStack Query's `select` option. Layer 2 hooks use this to extract the relevant data from the API response wrapper and provide a fallback so `data` is never `undefined` in components.

### List hook — fallback `[]`

```ts
// api/hooks/useGetFolders/index.ts
import type { IGetFoldersResponse, Folder } from "@tayemno/shared";

type FolderWithKey = Folder & { symmetricKey: string };

export const useGetFolders = () => {
  const query = useApiGet<IGetFoldersResponse, FolderWithKey[]>(
    [QueryKeyEnum.FOLDERS],
    EndpointEnum.FOLDERS,
    { select: (data) => data.folders },
  );

  return { ...query, data: query.data ?? [] };
};
```

```tsx
// In a component — data is always FolderWithKey[], even during initial loading:
const { data: folders } = useGetFolders();
```

### Single-item hook — fallback `null`

```ts
// api/hooks/useGetFolderById/index.ts
export const useGetFolderById = (id: string) => {
  const query = useApiGet<IGetFolderByIdResponse, FolderWithKey | null>(
    [QueryKeyEnum.FOLDER, id],
    `${EndpointEnum.FOLDERS}/${id}`,
    {
      select: (data) => data.folder,
      enabled: !!id,
    },
  );

  return { ...query, data: query.data ?? null };
};
```

```tsx
// In a component — data is always FolderWithKey | null:
const { data: folder } = useGetFolderById(folderId);
```

## Rules

1. **Always use enums** — never hardcode query keys or endpoint paths as strings.
2. **One hook per endpoint** — each Layer 2 hook lives in its own folder (`api/hooks/useGetX/index.ts` or `api/hooks/usePostX/index.ts`).
3. **Naming convention** — prefix with HTTP method: `useGet...`, `usePost...`, `usePatch...`.
4. **Response/Request interfaces** — declare `I...Response` and `I...Request` interfaces in the hook file (or import from `@tayemno/shared` if shared with the backend).
5. **No direct axios calls in components** — always go through a Layer 2 hook.
6. **Always use `select` + fallback** — Layer 2 GET hooks must use `select` to extract data from the response wrapper and provide a fallback (`[]` for lists, `null` for single items) so `data` is never `undefined` in components.
