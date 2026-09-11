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
  return useApiPost<IRegisterRequest, IRegisterResponse>(
    EndpointEnum.REGISTER,
  );
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

## Rules

1. **Always use enums** — never hardcode query keys or endpoint paths as strings.
2. **One hook per endpoint** — each Layer 2 hook lives in its own folder (`api/hooks/useGetX/index.ts` or `api/hooks/usePostX/index.ts`).
3. **Naming convention** — prefix with HTTP method: `useGet...`, `usePost...`, `usePatch...`.
4. **Response/Request interfaces** — declare `I...Response` and `I...Request` interfaces in the hook file (or import from `@tayemno/shared` if shared with the backend).
5. **No direct axios calls in components** — always go through a Layer 2 hook.
