

export default function StocktakingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-16">{children}</main>
    </>
  );
}