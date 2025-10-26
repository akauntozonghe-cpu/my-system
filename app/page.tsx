export default function Home() {
  const month = new Date().getMonth() + 1;
  const season: "spring" | "summer" | "autumn" | "winter" =
    month >= 3 && month <= 5
      ? "spring"
      : month >= 6 && month <= 8
      ? "summer"
      : month >= 9 && month <= 11
      ? "autumn"
      : "winter";

  const ver = "ver 1.0.0";

  const messages = {
    spring: "新しい始まりを支える在庫管理",
    summer: "活気と責任を担う",
    autumn: "実りを守る在庫管理",
    winter: "静けさの中で責任を果たす",
  };

  return (
    <main className={`season-${season} flex min-h-screen items-center justify-center relative overflow-hidden`}>
      <div className="particles absolute inset-0 pointer-events-none"></div>

      <div className="ui-card text-center">
        <h1 className="title">
          在庫管理システム <span className="ver">{ver}</span>
        </h1>
        <p className="subtitle">誇りと責任の舞台</p>
        <p className="lead">一つひとつの在庫が、信頼の証</p>
        <p className="season-copy">{messages[season]}</p>

        <a href="/login" className="cta">
          責任を果たすためにログインする
        </a>
      </div>
    </main>
  );
}