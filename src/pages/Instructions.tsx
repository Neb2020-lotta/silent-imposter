import { useNavigate } from "react-router-dom";
import { Target, Users, ListOrdered, Search, Trophy, ArrowLeft } from "lucide-react";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

export default function Instructions() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full px-5 py-8 md:px-10 md:py-12"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Manual
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold uppercase tracking-tight leading-[0.95]" style={{ fontFamily: mono }}>
            Wie spielt<br />man?
          </h1>
          <div className="mt-4 h-[3px] w-12" style={{ background: "hsl(var(--game-accent))" }} />
        </header>

        <div className="space-y-7">
          <Section icon={<Target className="h-6 w-6" />} title="Ziel des Spiels">
            <p>
              Die <b>Crewmates</b> kennen alle dasselbe geheime Wort. Ein oder mehrere <b>Imposter</b> kennen es nicht.
              Crewmates wollen den Imposter enttarnen — der Imposter will unentdeckt bleiben.
            </p>
          </Section>

          <Section icon={<Users className="h-6 w-6" />} title="Spielvorbereitung">
            <ul className="space-y-2 list-disc pl-5">
              <li>3–10 Spieler (lokal, online oder gegen KI).</li>
              <li>Eine Kategorie wählen (z.B. Allgemein, Filme, Tiere).</li>
              <li>Anzahl der Imposter festlegen (1–4).</li>
              <li>Jeder bekommt geheim seine Rolle: Wort oder allgemeiner Tipp.</li>
            </ul>
          </Section>

          <Section icon={<ListOrdered className="h-6 w-6" />} title="Spielablauf">
            <ol className="space-y-3 list-decimal pl-5">
              <li><b>Rollen sehen:</b> Jeder Spieler liest seine Karte privat.</li>
              <li><b>Hinweis-Runden:</b> Reihum gibt jeder kurze Hinweise zum Wort, ohne es direkt zu nennen. 3 Runden insgesamt.</li>
              <li><b>Diskussion:</b> Wer klingt verdächtig? Wer ist zu vage?</li>
              <li><b>Abstimmung:</b> Jeder stimmt geheim ab.</li>
              <li><b>Auflösung:</b> Der mit den meisten Stimmen wird enttarnt.</li>
            </ol>
          </Section>

          <Section icon={<Search className="h-6 w-6" />} title="Imposter erkennen">
            <ul className="space-y-2 list-disc pl-5">
              <li>Hinweise sind zu vage oder zu allgemein.</li>
              <li>Wiederholt nur, was andere bereits gesagt haben.</li>
              <li>Reagiert nervös oder ausweichend in der Diskussion.</li>
              <li>Stellt verdächtig viele Gegenfragen.</li>
            </ul>
          </Section>

          <Section icon={<Trophy className="h-6 w-6" />} title="So gewinnt der Imposter">
            <ul className="space-y-2 list-disc pl-5">
              <li>Bleibt unentdeckt bis zum Ende.</li>
              <li>Hört aufmerksam zu und imitiert plausibel.</li>
              <li>Lenkt Verdacht auf andere — ohne zu übertreiben.</li>
              <li>Gibt Hinweise, die zu vielen Wörtern passen könnten.</li>
            </ul>
          </Section>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-12 w-full py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all"
          style={{
            fontFamily: mono,
            background: "hsl(var(--game-accent))",
            color: "hsl(0 0% 8%)",
            borderRadius: 2,
            boxShadow: "var(--game-button-shadow)",
          }}
        >
          ▶ Spiel starten
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section
      className="p-5 md:p-6"
      style={{
        background: "hsl(var(--game-card-bg))",
        border: "1px solid hsl(var(--game-border))",
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span style={{ color: "hsl(var(--game-accent))" }}>{icon}</span>
        <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide" style={{ fontFamily: mono }}>
          {title}
        </h2>
      </div>
      <div className="text-base leading-relaxed" style={{ fontFamily: rubik, color: "hsl(var(--game-text))" }}>
        {children}
      </div>
    </section>
  );
}
