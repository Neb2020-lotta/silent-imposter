import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface AIPlayer {
  name: string;
  isImposter: boolean;
  word: string; // real word for crewmates, "" for imposter (they only see hint)
  hint: string; // generic category hint shown to imposter
}

interface RequestBody {
  category: string;
  word: string;
  hint: string;
  players: AIPlayer[];
  round: number;
  previousHints: { name: string; text: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const { category, word, hint, players, round, previousHints } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const system = `Du spielst das Partyspiel "Silent Imposter" auf Deutsch.
Kategorie: ${category}.
Es gibt mehrere Spieler. Jeder Crewmate kennt das geheime Wort. Der Imposter kennt nur einen vagen Hinweis und muss bluffen, ohne aufzufliegen.
Jeder Spieler gibt pro Runde EINEN sehr kurzen Hinweis (max. 6 Wörter), der das Wort beschreibt, ohne es zu nennen.
- Crewmates: gib einen subtilen, nicht zu offensichtlichen Hinweis (nicht das Wort nennen, keine direkten Synonyme).
- Imposter: bluffe basierend nur auf dem allgemeinen Hinweis. Klinge plausibel, aber bleibe vage.
Wiederhole keine vorherigen Hinweise. Antworte NUR mit dem Hinweistext, ohne Anführungszeichen, ohne Namen, ohne Erklärung.`;

    const historyText = previousHints.length
      ? `\n\nBisherige Hinweise:\n${previousHints.map((h) => `- ${h.name}: ${h.text}`).join("\n")}`
      : "";

    const results: { name: string; text: string }[] = [];

    for (const p of players) {
      const userMsg = p.isImposter
        ? `Du bist "${p.name}", der IMPOSTER. Du kennst das echte Wort NICHT. Allgemeiner Hinweis: "${hint}". Runde ${round}. Gib einen plausibel klingenden, vagen Hinweis.${historyText}`
        : `Du bist "${p.name}", ein CREWMATE. Das geheime Wort ist "${word}". Runde ${round}. Gib einen kreativen Hinweis, ohne das Wort zu nennen.${historyText}`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte kurz warten." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI-Guthaben aufgebraucht. Bitte in Settings → Workspace → Usage aufladen." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      let text: string = data.choices?.[0]?.message?.content?.trim() ?? "...";
      text = text.replace(/^["„»]+|["“«]+$/g, "").replace(/\s+/g, " ").slice(0, 80);
      results.push({ name: p.name, text });
    }

    return new Response(JSON.stringify({ hints: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-imposter error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
