# Phase 3 — Frontend: Forced Password Change

**Size/shape:** ~4 new files (page, crypto builder, validation, API hook), ~3 modified files (ProtectedRoute, SignInPage, App.tsx, en.json, RouteEnum, EndpointEnum). All frontend.

**Why this approach is sufficient — don't add anything beyond this:** This phase delivers the invited user's onboarding experience: sign in with temp password → forced redirect to change-password page → enter new master password → re-encrypt private key → become active. Don't build voluntary password change from Settings. Don't add password strength meter (the validation schema already enforces requirements). The ChangePasswordPage is a standalone page outside AppShellLayout (no nav needed during password change).

---

## Steps

### 1. Add route and endpoint enums

**File:** `packages/frontend/src/enums/routing/RouteEnum/index.ts`

Add after `USERS`:
```typescript
  CHANGE_PASSWORD = "/change-password",
```

**File:** `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add at the end:
```typescript
  CHANGE_PASSWORD = "/auth/change-password",
```

---

### 2. Add i18n strings

**File:** `packages/frontend/src/i18n/locales/en.json`

Add `"changePassword"` section at the top level:

```json
  "changePassword": {
    "title": "Change your password",
    "subtitle": "You must set a new master password to continue.",
    "fields": {
      "password": {
        "label": "New master password",
        "placeholder": "Enter new password"
      },
      "confirmPassword": {
        "label": "Confirm new password",
        "placeholder": "Re-enter new password"
      }
    },
    "validation": {
      "passwordRequired": "Password is required",
      "passwordMinLength": "Has at least 6 characters",
      "passwordIncludesNumber": "Includes number",
      "passwordIncludesLowercase": "Includes lowercase letter",
      "passwordIncludesUppercase": "Includes uppercase letter",
      "passwordIncludesSpecial": "Includes special symbol",
      "confirmPasswordRequired": "Please confirm your password",
      "confirmPasswordMismatch": "Passwords do not match"
    },
    "submitButton": "Set new password"
  },
```

---

### 3. Create change-password validation schema

**New file:** `packages/frontend/src/validations/changePasswordSchema/index.ts`

Reuse the same password rules as `registerSchema` but with only `password` and `confirmPassword` fields:

```typescript
import * as yup from "yup";

export const changePasswordSchema = yup.object({
  password: yup
    .string()
    .required("changePassword.validation.passwordRequired")
    .min(6, "changePassword.validation.passwordMinLength")
    .matches(/[0-9]/, "changePassword.validation.passwordIncludesNumber")
    .matches(/[a-z]/, "changePassword.validation.passwordIncludesLowercase")
    .matches(/[A-Z]/, "changePassword.validation.passwordIncludesUppercase")
    .matches(
      /[^a-zA-Z0-9]/,
      "changePassword.validation.passwordIncludesSpecial",
    ),
  confirmPassword: yup
    .string()
    .required("changePassword.validation.confirmPasswordRequired")
    .oneOf(
      [yup.ref("password")],
      "changePassword.validation.confirmPasswordMismatch",
    ),
});
```

---

### 4. Create change-password API hook

**New file:** `packages/frontend/src/api/hooks/usePostChangePassword/index.ts`

```typescript
import type { IChangePasswordRequest, IChangePasswordResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostChangePassword = () => {
  return useApiPost<IChangePasswordRequest, IChangePasswordResponse>(
    EndpointEnum.CHANGE_PASSWORD,
  );
};
```

---

### 5. Create change-password payload builder

**New file:** `packages/frontend/src/pages/ChangePasswordPage/buildChangePasswordPayload/index.ts`

This takes the user's decrypted private key (already in memory from sign-in) and re-encrypts it with a new KEK derived from the new password.

```typescript
import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../../utils/crypto/deriveKey";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { IChangePasswordRequest } from "@tayemno/shared";

interface IParams {
  email: string;
  newPassword: string;
  privateKey: string;
}

export const buildChangePasswordPayload = async ({
  email,
  newPassword,
  privateKey,
}: IParams): Promise<IChangePasswordRequest> => {
  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(
    srpSalt,
    email.toLowerCase(),
    newPassword,
  );
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const kdfSalt = await generateSalt();
  const kek = await deriveKey({
    password: newPassword,
    saltHex: kdfSalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const encryptedPrivateKey = await SymmetricCrypto.encrypt(privateKey, kek);

  return {
    srpSalt,
    srpVerifier,
    kdfSalt,
    kdfAlgorithm: "argon2id",
    kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
    kdfIterations: KDF_ITERATIONS,
    kdfParallelism: KDF_PARALLELISM,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
  };
};
```

---

### 6. Create ChangePasswordPage component

**New file:** `packages/frontend/src/pages/ChangePasswordPage/index.tsx`

A standalone page (no AppShell) with a form for new password + confirm password. On submit: builds payload → calls API → updates auth state → navigates to HOME.

The page should:
- Redirect to HOME if `user.forcePasswordChange` is false (guard)
- Use `useFormik` with `changePasswordSchema`
- Get `keyPair` and `user` from `useAuth()`
- On submit: `buildChangePasswordPayload({ email: user.email, newPassword, privateKey: keyPair.privateKey })` → `mutateAsync` → update local auth state to clear `forcePasswordChange` → navigate HOME
- Show loading state during crypto derivation (Argon2id is slow)
- Follow the same layout pattern as RegisterPage (Container + Paper + Stack)

The auth state update after successful password change needs to update `user.forcePasswordChange` to `false`. Use a new `updateUser` method on the auth context, or create a new `setForcePasswordChange` helper.

**Simpler approach:** Add an `updateUser` method to `AuthContext` that merges partial user data:

```typescript
// In AuthContext:
updateUser: (updates: Partial<ISignInUserData>) => void;

// Implementation:
updateUser: (updates) => {
  setAuthState((prev) => ({
    ...prev,
    user: prev.user ? { ...prev.user, ...updates } : null,
  }));
},
```

Then in ChangePasswordPage after successful API call:
```typescript
updateUser({ forcePasswordChange: false });
navigate(RouteEnum.HOME);
```

---

### 7. Modify AuthContext to add `updateUser`

**File:** `packages/frontend/src/contexts/AuthContext/index.tsx`

**7a.** Add `updateUser` to the `IAuthContext` interface:

Before:
```typescript
interface IAuthContext extends IAuthState {
  isAuthenticated: boolean;
  signIn: (token: string, user: ISignInUserData, keyPair: IKeyPair, workspace: IWorkspaceData) => void;
  signOut: () => void;
}
```

After:
```typescript
interface IAuthContext extends IAuthState {
  isAuthenticated: boolean;
  signIn: (token: string, user: ISignInUserData, keyPair: IKeyPair, workspace: IWorkspaceData) => void;
  signOut: () => void;
  updateUser: (updates: Partial<ISignInUserData>) => void;
}
```

**7b.** Add implementation in the `useMemo` value:

After the `signOut` method, add:
```typescript
      updateUser: (updates) => {
        setAuthState((prev) => {
          const next = {
            ...prev,
            user: prev.user ? { ...prev.user, ...updates } : null,
          };
          persistAuthState(next);
          return next;
        });
      },
```

---

### 8. Modify ProtectedRoute to redirect on forcePasswordChange

**File:** `packages/frontend/src/components/routing/ProtectedRoute/index.tsx`

Before:
```typescript
export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Outlet />;
  return <Navigate to={RouteEnum.SIGN_IN} replace />;
};
```

After:
```typescript
export const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to={RouteEnum.SIGN_IN} replace />;

  if (
    user?.forcePasswordChange &&
    location.pathname !== RouteEnum.CHANGE_PASSWORD
  ) {
    return <Navigate to={RouteEnum.CHANGE_PASSWORD} replace />;
  }

  return <Outlet />;
};
```

Add imports for `useLocation` from `react-router-dom` and ensure `RouteEnum` is imported.

---

### 9. Modify SignInPage to redirect on forcePasswordChange

**File:** `packages/frontend/src/pages/SignInPage/index.tsx`

In the `onSubmit` handler, after `signIn(...)`, check `forcePasswordChange` before navigating:

Before (lines 59-60):
```typescript
        signIn(result.token, result.user, result.keyPair, result.workspace);
        navigate(RouteEnum.HOME);
```

After:
```typescript
        signIn(result.token, result.user, result.keyPair, result.workspace);

        if (result.user.forcePasswordChange) {
          navigate(RouteEnum.CHANGE_PASSWORD);
        } else {
          navigate(RouteEnum.HOME);
        }
```

---

### 10. Add ChangePasswordPage route in App.tsx

**File:** `packages/frontend/src/App.tsx`

**10a.** Add import:
```typescript
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
```

**10b.** Add the route inside the `<Route element={<ProtectedRoute />}>` group but OUTSIDE `<Route element={<AppShellLayout />}>`:

Before:
```tsx
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShellLayout />}>
                <Route path={RouteEnum.HOME} element={<HomePage />} />
                ...
              </Route>
            </Route>
```

After:
```tsx
            <Route element={<ProtectedRoute />}>
              <Route
                path={RouteEnum.CHANGE_PASSWORD}
                element={<ChangePasswordPage />}
              />
              <Route element={<AppShellLayout />}>
                <Route path={RouteEnum.HOME} element={<HomePage />} />
                ...
              </Route>
            </Route>
```

This places ChangePasswordPage within ProtectedRoute (requires auth) but outside AppShellLayout (no nav sidebar).

---

### Summary of new files

```
packages/frontend/src/
  pages/ChangePasswordPage/
    index.tsx                                    # Page component (~90-110 lines)
    buildChangePasswordPayload/index.ts          # Crypto payload builder (~50 lines)
  validations/changePasswordSchema/index.ts      # Yup schema (~25 lines)
  api/hooks/usePostChangePassword/index.ts       # POST mutation hook (~12 lines)
```

### Summary of modified files

```
packages/frontend/src/
  enums/routing/RouteEnum/index.ts               # Add CHANGE_PASSWORD
  enums/api/EndpointEnum/index.ts                # Add CHANGE_PASSWORD
  i18n/locales/en.json                           # Add changePassword section
  contexts/AuthContext/index.tsx                  # Add updateUser method
  components/routing/ProtectedRoute/index.tsx     # Add forcePasswordChange redirect
  pages/SignInPage/index.tsx                     # Check forcePasswordChange on sign-in
  App.tsx                                        # Add ChangePasswordPage route
```
