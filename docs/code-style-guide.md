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

### Validation Schemas

Schemas live in `validations/<schemaName>/index.ts`. They use **i18n key strings** as error messages — never call `t()` inside a schema:

```ts
// validations/registerSchema/index.ts
import * as yup from "yup";

export const registerSchema = yup.object().shape({
  name: yup.string().trim().required("register.validation.nameRequired"),
  // ...
});
```

### Formik Usage

Use the `useFormik` hook with typed generics, importing the schema:

```tsx
const formik = useFormik<IRegisterFormValues>({
  initialValues: { ... },
  validationSchema: registerSchema,
  validateOnChange: true,
  validateOnBlur: false,
  onSubmit: (values) => { ... },
});
```

Translate errors at display time with `t()`:

```tsx
error={formik.touched.fieldName && formik.errors.fieldName && t(formik.errors.fieldName)}
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
<Title>{t("register.title")}</Title>;
```

## SizeEnum for Numeric Layout Values

Never use raw numbers for spacing/padding/margin. Use `SizeEnum`:

```tsx
import { SizeEnum } from "../../enums/ui/SizeEnum";

<Container py={SizeEnum.XL}>   // 40
<Paper p={SizeEnum.LG}>        // 30
<Text mt={SizeEnum.XS}>        // 5
```

## UI Component Styling

Never pass inline `styles` to override UI wrapper components. Instead, extend the wrapper component with a new prop:

```tsx
// Correct — extend the wrapper
interface IProps extends TextInputProps {
  successHighlight?: boolean;
}

export const TextInput = ({ successHighlight, styles, ...rest }: IProps) => {
  // apply styles internally based on the prop
};

// Usage
<TextInput successHighlight={isAvailable} />

// Incorrect — inline styles from the consumer
<TextInput styles={{ input: { borderColor: "green" } }} />
```

## Derived Values with Multiple Conditions

Use `useMemo` with early-return guards instead of nested ternaries:

```tsx
// Correct — useMemo with early returns
const error = useMemo(() => {
  if (!formik.errors.field) return;
  if (!hasValidationError) return;
  if (isTaken) return t("validation.taken");
}, [hasValidationError, formik.errors.field, t, isTaken]);

// Incorrect — nested ternaries
const error = hasValidationError
  ? formik.errors.field
  : isTaken
    ? t("validation.taken")
    : undefined;
```

## Nullish Checks

Use `!!value` (double negation) instead of `value !== undefined` or `value !== null` for truthiness checks:

```ts
// Correct
const isLoaded = !!data && data.isFree;

// Incorrect
const isLoaded = data !== undefined && data.isFree;
const isLoaded = data !== null && data.isFree;
```

## Import Conventions

1. External libraries first (`react`, `formik`, `yup`, `i18next`, `react-i18next`)
2. Internal UI components (`../../components/ui/...`)
3. Enums and utilities (`../../enums/...`)

Separate groups with a blank line when it aids readability.
