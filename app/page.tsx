// app/page.tsx
import RegisterFlow from "./inventory/register/RegisterFlow";

export default function Home() {
  return (
    <main>
      <h1>商品登録システム</h1>
      <RegisterFlow />
    </main>
  );
}
