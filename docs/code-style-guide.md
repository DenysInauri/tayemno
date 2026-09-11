# Code Style Guide

## Arrow Functions Only

All components, helpers, and utility functions must use arrow function syntax. No `function` keyword in project source files.

```tsx
// Correct
export const RegisterPage = () => { ... };
const createSchema = (t: TFunction) => yup.object().shape({ ... });

// Incorrect
export function RegisterPage() { ... }
function createSchema(t: TFunction) { ... }
```

## Interface Naming

All interfaces must be prefixed with `I`:

```tsx
interface IRegisterFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
```

Type aliases do not use the `I` prefix:

```tsx
type TextInputProps = ComponentProps<typeof MantineTextInput>;
```

## Folder-Based File Structure

Every component and page uses `ComponentName/index.tsx`:

```
components/ui/Button/index.tsx
pages/RegisterPage/index.tsx
enums/ui/SizeEnum/index.ts
```

Import paths reference the folder (the bundler resolves `index.tsx`):

```tsx
import { Button } from "../../components/ui/Button";
import { SizeEnum } from "../../enums/ui/SizeEnum";
```

## Form Patterns (Formik + Yup)

### Schema Factory

Validation schemas are created via arrow-function factories that accept `TFunction` for i18n:

```tsx
const createRegisterSchema = (t: TFunction) =>
  yup.object().shape({
    name: yup.string().trim().required(t("register.validation.nameRequired")),
    // ...
  });
```

### Formik Usage

Use the `useFormik` hook with typed generics:

```tsx
const formik = useFormik<IRegisterFormValues>({
  initialValues: { ... },
  validationSchema: createRegisterSchema(t),
  validateOnChange: true,
  validateOnBlur: false,
  onSubmit: (values) => { ... },
});
```

Display errors with the touched + errors pattern:

```tsx
error={formik.touched.fieldName && formik.errors.fieldName}
```

## i18n Key Structure

Translation keys follow a dot-notation hierarchy:

```
<page>.<section>.<detail>
```

Example for the register page:

```
register.title
register.subtitle
register.signInLink
register.submitButton
register.fields.<field>.label
register.fields.<field>.placeholder
register.validation.<ruleName>
```

Use `useTranslation()` from `react-i18next` to access the `t` function:

```tsx
const { t } = useTranslation();
// ...
<Title>{t("register.title")}</Title>
```

## SizeEnum for Numeric Layout Values

Never use raw numbers for spacing/padding/margin. Use `SizeEnum`:

```tsx
import { SizeEnum } from "../../enums/ui/SizeEnum";

<Container py={SizeEnum.XL}>   // 40
<Paper p={SizeEnum.LG}>        // 30
<Text mt={SizeEnum.XS}>        // 5
```

## Import Conventions

1. External libraries first (`react`, `formik`, `yup`, `i18next`, `react-i18next`)
2. Internal UI components (`../../components/ui/...`)
3. Enums and utilities (`../../enums/...`)

Separate groups with a blank line when it aids readability.
