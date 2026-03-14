# Fiche — Claude Code Rules

## Stack

- Next.js 16.1 App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui (powered by **@base-ui/react**, NOT Radix UI)
- Plate.js v52 (`platejs` / `@platejs/*`)
- @xyflow/react v12
- Drizzle ORM + PostgreSQL

---

## ⚠️ Base UI: Never nest `<button>` inside a Trigger

This project uses **@base-ui/react** (not Radix UI). Base UI Trigger components
(`PopoverTrigger`, `DialogTrigger`, `AlertDialogTrigger`, `TooltipTrigger`, etc.)
render their own `<button>` element. Wrapping a shadcn `<Button>` (which also
renders `<button>`) inside them creates invalid nested buttons and a hydration error.

### ❌ Wrong — button inside button

```tsx
<PopoverTrigger>
  <Button>Click me</Button>        {/* <button> inside <button> → hydration error */}
</PopoverTrigger>

<DialogTrigger asChild>            {/* asChild doesn't exist in Base UI */}
  <Button>Open</Button>
</DialogTrigger>
```

### ✅ Correct — controlled open state + trigger outside

```tsx
const [open, setOpen] = useState(false);

<>
  <Button onClick={() => setOpen(true)}>Open</Button>
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverContent>...</PopoverContent>
  </Popover>
</>
```

Or use a plain `<button>` as the trigger:

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <button type="button" onClick={() => setOpen(true)}>
    Open
  </button>
  <PopoverContent>...</PopoverContent>
</Popover>
```

**Rule:** Never put `<Button>` or any element that renders `<button>` inside a
`*Trigger` component. Always use controlled `open` + `onOpenChange` props instead.

---

## User identity

- UUID generated on first visit, stored in `localStorage` key `fiche-user-id`
- Also stored in a cookie for potential server reads
- `?session=<uuid>` URL param lets another browser adopt the same identity
- Server actions always receive `userId` as parameter and validate ownership via Zod + DB check

## Server Actions rules

- Zod validation on every input before touching DB
- Ownership check on every DB query (verify `userId` matches the resource)
- `revalidatePath` after mutations that affect server-rendered data

## React Flow (board canvas)

- Never mutate node/edge objects directly — always spread: `{ ...node, data: newData }`
- Use `applyNodeChanges` / `applyEdgeChanges` from `@xyflow/react`
- `node.measured.width` / `node.measured.height` for actual dimensions (v12)
- Canvas state managed via `useReducer` (not multiple `useState`)

## Plate.js (card editor)

- Package: `platejs` (NOT `@udecode/plate`)
- Plugins: `@platejs/*` namespace
- Content format: Slate JSON array, default: `[{ type: "p", children: [{ text: "" }] }]`
- Always key the `<PlateEditor>` on `nodeId` to reset on card change
