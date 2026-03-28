# 09 — Tag Selection Popup: A TypeScript Walkthrough

← [Wiki Home](./Home.md)

---

> **Who this is for:** Anyone learning TypeScript who wants to see real-world
> concepts through the lens of a concrete feature. We recently added the
> ability to select tags from a popup when writing transaction notes. This page
> walks through every file that was changed, in plain English, with
> TypeScript concept callouts along the way.

---

## What was built

Before this change, adding a tag to a transaction note meant typing it by
hand — e.g. `#groceries`. There was no way to discover or pick from the list
of tags you had already created.

After this change:

- **Desktop / desktop-modal view** — typing `#` in any notes text area opens
  an inline dropdown that filters your tags as you keep typing. Arrow keys
  navigate the list; Enter or Tab inserts the tag; Escape closes the list.
- **Mobile view** — a small tag icon 🏷️ appears next to the Notes label. Tap
  it to open a full-screen search modal that lets you pick a tag, which then
  gets appended to the notes field.

Five files were touched:

| File | What changed |
|---|---|
| `Notes.tsx` | Inline autocomplete dropdown added to the editable textarea |
| `TagAutocompleteModal.tsx` | Brand-new file — the mobile/modal tag picker |
| `modalsSlice.ts` | New entry in the central list of modal types |
| `Modals.tsx` | Wires the new modal type to its React component |
| `TransactionEdit.tsx` | Adds the tag icon button to mobile Notes fields |

---

## 1 · `TagEntity` — reading an existing type

Before diving into the new code, it helps to see the *data shape* we are
working with. Tags are described by this type in
`packages/loot-core/src/types/models/tags.ts`:

```ts
export type TagEntity = {
  id: string;
  tag: string;
  color?: string | null;
  description?: string | null;
};
```

**TypeScript concept — `type`**  
A `type` is a blueprint that tells TypeScript what shape a piece of data
must have. Think of it like a form with labelled fields. `TagEntity` says:
"any tag object must have an `id` (always a string) and a `tag` (always a
string); it *may optionally* have a `color` and a `description`."

**TypeScript concept — optional fields (`?`)**  
The `?` after `color` and `description` means those fields are *optional* —
the object is still a valid `TagEntity` even if they are absent. Without the
`?`, TypeScript would refuse to compile code that omitted them.

**TypeScript concept — `string | null`**  
The pipe `|` means "this OR that". `string | null` means the value can be a
string **or** the special value `null` (nothing). Combined with `?`, the
field can be missing entirely, `null`, or a real string — all three are
allowed.

---

## 2 · `Notes.tsx` — the inline desktop dropdown

This is the most educational file. Let's walk through it section by section.

### 2a · Imports — `import type`

```ts
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { TagEntity } from 'loot-core/types/models';
```

**TypeScript concept — `import type`**  
Putting the word `type` after `import` tells TypeScript (and the bundler)
"I only need this for *type-checking* at compile time — don't include it in
the final JavaScript bundle." It's a zero-cost import: it helps you catch
bugs without adding weight to the app.

### 2b · A named constant instead of a magic number

```ts
const TAG_DROPDOWN_CLOSE_DELAY_MS = 150;
```

Not strictly a TypeScript feature, but a best-practice you will see
throughout the codebase. `150` on its own is a "magic number" — a reader
can't tell what it means. Naming it `TAG_DROPDOWN_CLOSE_DELAY_MS` makes the
*why* obvious and gives a single place to change the value later.

### 2c · Describing a component's "inputs" with a type

```ts
type TagSuggestionsProps = {
  query: string;
  activeIndex: number;
  tags: TagEntity[];
  onSelect: (tag: TagEntity) => void;
};
```

**TypeScript concept — props types**  
React components receive data through *props* (short for properties). Defining
a type for them is like writing a contract: "whoever uses this component must
pass these exact fields, with these exact types." If you pass a `number`
where `query` is expected, TypeScript shows a red underline immediately —
before you even run the app.

**TypeScript concept — arrays (`T[]`)**  
`TagEntity[]` means "an array whose every element must be a `TagEntity`."
TypeScript then knows that `tags[0]` is a `TagEntity` and auto-completes
`.tag`, `.color`, etc. for you.

**TypeScript concept — function types**  
`(tag: TagEntity) => void` describes a *function*: one that accepts a
`TagEntity` and returns nothing (`void`). This is how you tell TypeScript
that `onSelect` is a callback — a function the parent component will hand in
so the child can call it when the user picks a tag.

### 2d · The `TagSuggestions` component

```ts
function TagSuggestions({
  query,
  activeIndex,
  tags,
  onSelect,
}: TagSuggestionsProps) {
```

**TypeScript concept — destructuring with a type annotation**  
The `{ query, activeIndex, tags, onSelect }` syntax *destructures* the props
object — pulling each field out into its own variable instead of writing
`props.query`, `props.activeIndex`, etc. The `: TagSuggestionsProps` after
the closing `}` is the type annotation: TypeScript now knows the exact type
of every variable without you having to annotate each one individually.

```ts
const filtered = tags.filter(t =>
  getNormalisedString(t.tag).includes(getNormalisedString(query)),
);
```

`tags.filter(...)` returns a new array containing only the elements for which
the callback returns `true`. Because TypeScript knows `tags` is
`TagEntity[]`, it knows `t` inside the callback is a `TagEntity`, so
`t.tag` auto-completes.

### 2e · Describing the `Notes` component's props

```ts
type NotesProps = {
  notes: string;
  editable?: boolean;
  focused?: boolean;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  getStyle?: (editable: boolean) => CSSProperties;
};
```

Notice that `onChange`, `onBlur`, and `getStyle` are all optional callback
functions (they have `?`). The `Notes` component can be used in read-only
mode (no callbacks needed) or edit mode (callbacks provided by the parent).

### 2f · State — `useState` with a generic type

```ts
const [tagQuery, setTagQuery] = useState<string | null>(null);
const [activeTagIdx, setActiveTagIdx] = useState(0);
```

**TypeScript concept — generics (`<T>`)**  
The `<string | null>` in `useState<string | null>(null)` is a *generic type
argument*. It tells TypeScript: "this piece of state can be a string or null."
Without it TypeScript would infer `null` forever and refuse to let you later
store a string.

For `activeTagIdx`, TypeScript *infers* the type as `number` from the initial
value `0` — you don't always need to write the generic explicitly.

### 2g · `useRef` — a reference to a real DOM element

```ts
const textAreaRef = useRef<HTMLTextAreaElement>(null);
```

**TypeScript concept — `useRef` generic**  
`useRef<HTMLTextAreaElement>` tells TypeScript: "when I eventually assign this
ref, it will be an HTML `<textarea>` element." This unlocks auto-complete for
methods like `.selectionStart`, `.setSelectionRange`, and `.focus()` — all
real textarea-specific features.

### 2h · The `getTagQueryAtCursor` function

```ts
function getTagQueryAtCursor(
  value: string,
  cursorPos: number,
): string | null {
  const textBeforeCursor = value.slice(0, cursorPos);
  const hashMatch = textBeforeCursor.match(/(^|[\s\n])#(\S*)$/);
  if (hashMatch) {
    return hashMatch[2];
  }
  return null;
}
```

The return type `: string | null` is declared explicitly. This documents
intent ("this function can come up empty") and forces every *caller* of the
function to handle both cases. If you tried to pass the result straight to
`includes()` without checking for `null`, TypeScript would flag it as an
error.

The regex `/(^|[\s\n])#(\S*)$/` looks for a `#` at the start of the text or
after whitespace, followed by non-whitespace characters, right at the end of
the slice. The parentheses `()` create *capture groups*, so `hashMatch[2]`
is the word after `#` (e.g. `"groc"` when you have typed `#groc`).

### 2i · `handleChange` — a typed event handler

```ts
function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
  const value = e.target.value;
  onChange?.(value);
  ...
}
```

**TypeScript concept — `ChangeEvent<T>`**  
`ChangeEvent<HTMLTextAreaElement>` is a generic type from React. The `<T>`
part says "this change event came from a textarea" so that `e.target` is
typed as an `HTMLTextAreaElement` and you get proper auto-complete.

**TypeScript concept — optional chaining (`?.`)**  
`onChange?.(value)` means "call `onChange(value)` *only if* `onChange` is
not `undefined`." Without the `?`, TypeScript would error because `onChange`
is an optional prop — it might not be provided.

### 2j · `handleKeyDown` — guarding with early returns

```ts
function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
  if (tagQuery === null) return;
  const filtered = getFilteredTags(tagQuery);
  if (filtered.length === 0) return;
  ...
}
```

After the first `if` check TypeScript knows `tagQuery` is a `string` (it
narrowed it from `string | null`). This is called **type narrowing** — one of
TypeScript's most helpful features. You use a plain `if` and TypeScript
tracks the information for the rest of the block.

### 2k · `insertTag` — the optional chaining operator and null-safe access

```ts
function insertTag(tag: TagEntity) {
  const textarea = textAreaRef.current;
  if (!textarea) return;
  ...
  onChange?.(newValue);
  ...
}
```

`textAreaRef.current` can be `null` if the element hasn't mounted yet.
The `if (!textarea) return` guard tells TypeScript: "below this line,
`textarea` is definitely not null." TypeScript calls this a *type guard*.

### 2l · The JSX return — conditional rendering

```tsx
return editable ? (
  <View style={{ position: 'relative', flex: 1 }}>
    <textarea ... />
    {tagQuery !== null && (
      <TagSuggestions ... />
    )}
  </View>
) : (
  <Text ...>...</Text>
);
```

`{tagQuery !== null && <TagSuggestions ... />}` is a common React pattern:
"render `TagSuggestions` only if `tagQuery` is not null." TypeScript
understands this — inside `<TagSuggestions>` it knows `tagQuery` is a
`string`.

---

## 3 · `TagAutocompleteModal.tsx` — a new file from scratch

### 3a · `Extract` — a powerful TypeScript utility type

```ts
type TagAutocompleteModalProps = Extract<
  ModalType,
  { name: 'tag-autocomplete' }
>['options'];
```

This is one of the most interesting patterns in the codebase. Let's unpack
it step by step:

1. `ModalType` is a big **union type** (many shapes joined with `|`) —
   basically a list of every modal the app knows about.
2. `Extract<ModalType, { name: 'tag-autocomplete' }>` filters that union
   down to the single entry whose `name` field is `'tag-autocomplete'`.
3. `['options']` then plucks the `options` property of that one entry.

The result is that `TagAutocompleteModalProps` *automatically* matches
whatever was declared in `modalsSlice.ts`. If you later change the options
type in one place, the component updates too — no copy-paste drift.

**TypeScript concept — union types**  
A union type (`A | B | C`) means "this value can be any one of these shapes."
`Extract` is a built-in utility that picks only the members of a union that
match a given pattern.

**TypeScript concept — indexed access types (`T['key']`)**  
Writing `SomeType['options']` is like looking up a key in an object — but at
the *type* level, not at runtime.

### 3b · `useState` for local search state

```ts
const [filter, setFilter] = useState('');
```

Because the initial value is `''` (a string), TypeScript infers
`filter: string` and `setFilter: (value: string) => void` automatically.
No explicit annotation needed.

### 3c · Rendering the list

```tsx
{filteredTags.map(tag => (
  <Button
    key={tag.id}
    onPress={() => {
      onSelect(`#${tag.tag}`);
      state.close();
    }}
  >
    <Text className={getTagCSS(tag.tag)}>#{tag.tag}</Text>
    {tag.description && (
      <Text ...>{tag.description}</Text>
    )}
  </Button>
))}
```

`tag.description && <Text>...` renders the description only if it is truthy
(not `null`, not `undefined`, not an empty string). TypeScript knows
`tag.description` is `string | null | undefined` from `TagEntity`, so it
lets us use this short-circuit pattern safely.

---

## 4 · `modalsSlice.ts` — extending a union type

```ts
| {
    name: 'tag-autocomplete';
    options: {
      onSelect: (tag: string) => void;
      onClose?: () => void;
    };
  }
```

The `|` at the start means "add one more member to the existing union."
`name: 'tag-autocomplete'` uses a **string literal type** — the value of
`name` isn't just *any* string, it must be *exactly* the string
`'tag-autocomplete'`. This lets TypeScript narrow which member of the union
you are dealing with when you check `modal.name`.

---

## 5 · `Modals.tsx` — hooking it all together

```tsx
import { TagAutocompleteModal } from './modals/TagAutocompleteModal';
...
case 'tag-autocomplete':
  return <TagAutocompleteModal key={key} {...modal.options} />;
```

**TypeScript concept — spread props (`{...modal.options}`)**  
`{...modal.options}` spreads all fields of `modal.options` as individual
props onto the component. TypeScript checks that the spread object's shape
matches `TagAutocompleteModalProps` — so if you forget a required prop or add
a typo, you get a compile error rather than a runtime bug.

Because `Modals.tsx` uses a `switch` on `modal.name`, TypeScript *narrows*
`modal` inside each `case` to the specific union member. In the
`'tag-autocomplete'` case it knows `modal.options` has `onSelect` and
(optionally) `onClose`. No type assertions (`as`) needed.

---

## 6 · `TransactionEdit.tsx` — `useCallback` for stable functions

### 6a · Child transaction tag button (simple version)

```ts
const [notesInputKey, setNotesInputKey] = useState(0);

function onOpenTagModal() {
  dispatch(
    pushModal({
      modal: {
        name: 'tag-autocomplete',
        options: {
          onSelect: tag => {
            const newNotes = (transaction.notes || '').trim()
              ? `${transaction.notes} ${tag}`
              : tag;
            onUpdate(transaction, 'notes', newNotes);
            setNotesInputKey(k => k + 1);
          },
        },
      },
    }),
  );
}
```

`notesInputKey` is a counter. After a tag is inserted it increments, which
changes the React `key` prop on the `<InputField>`, forcing React to re-mount
it so the displayed value matches the new notes string.

**TypeScript concept — `(transaction.notes || '')` default**  
`transaction.notes` might be `null` or `undefined`. The `|| ''` provides an
empty string fallback so `.trim()` never throws.

### 6b · Main transaction form (memoised version)

```ts
const onOpenTagModal = useCallback(
  (currentNotes: string) => {
    dispatch( pushModal({ ... }) );
  },
  [dispatch, transaction, onUpdateInner],
);
```

**TypeScript concept — `useCallback`**  
`useCallback` returns a *stable* version of the function — one that only
changes when one of the listed *dependencies* changes. Without it, a new
function object would be created on every render, which could trigger
unnecessary re-renders of child components that receive it as a prop.

TypeScript infers the full signature of the returned function from the
callback you pass in, so no extra annotation is needed.

---

## Key TypeScript concepts at a glance

| Concept | Where you saw it | Plain-English summary |
|---|---|---|
| `type` | `TagSuggestionsProps`, `NotesProps` | A named blueprint for an object's shape |
| Optional field `?` | `editable?: boolean` | The field may be absent — TypeScript will warn if you use it without checking |
| Union type `A \| B` | `string \| null`, `ModalType` | The value can be one of several shapes |
| Generics `<T>` | `useState<string \| null>`, `useRef<HTMLTextAreaElement>` | Parameterise a type or function with another type |
| `import type` | Top of `Notes.tsx` | Import only for type-checking, zero runtime cost |
| Type narrowing | `if (!textarea) return` | After a check TypeScript knows a narrower type |
| Optional chaining `?.` | `onChange?.(value)` | Call/access only if not null/undefined |
| `Extract<Union, Filter>` | `TagAutocompleteModalProps` | Pick matching members from a union type |
| Indexed access `T['key']` | `...>['options']` | Read a property's type at the type level |
| String literal type | `name: 'tag-autocomplete'` | Exact string values as types — great for `switch` narrowing |
| Spread props `{...obj}` | `{...modal.options}` | Pass all fields of an object as props, type-checked |
| `useCallback` | `onOpenTagModal` | Memoised function that only changes when dependencies change |

---

← [Wiki Home](./Home.md)
