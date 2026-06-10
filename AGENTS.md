# Ankita Designs Engineering Rules

## Light And Dark Mode

- Every new or modified UI node must be production-ready in both light and dark mode.
- This includes text, backgrounds, borders, icons, images, inputs, placeholders, buttons, cards, badges, navigation, dialogs, drawers, hover states, focus states, disabled states, loading states, empty states, success states, and error states.
- Use the existing `ThemeProvider` and Tailwind `dark:` classes. Do not create page-specific theme systems.
- Theme controls must be keyboard accessible, have descriptive accessible labels, and persist the selected preference.
- Never rely only on color to communicate status.
- Verify modified pages at desktop and mobile widths in both themes before considering the work complete.
- Do not add a component that is readable in only one theme.
