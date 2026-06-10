export function Screen({
  children
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="marketplace-page relative min-h-screen w-full overflow-x-hidden">
      {children}
    </main>
  );
}
