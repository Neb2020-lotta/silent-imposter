import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const PlayerSchema = z.object({
  name: z.string().min(1).max(30),
  isImposter: z.boolean(),
  word: z.string().max(60),
  hint: z.string().max(200),
});

const BodySchema = z.object({
  category: z.string().min(1).max(60),
  word: z.string().min(1).max(60),
  hint: z.string().max(200),
  players: z.array(PlayerSchema).min(1).max(6),
  round: z.number().int().min(1).max(3),
  previousHints: z
    .array(z.object({ name: z.string().min(1).max(30), text: z.string().max(200) }))
    .max(30),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Reject payloads larger than ~16 KB before parsing to short-circuit abuse
    const raw = await req.text();
    if (raw.length > 16_000) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsedInput: unknown;
    try { parsedInput = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = BodySchema.safeParse(parsedInput);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { category, word, hint, players, round, previousHints } = parsed.data;


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const system = `Du spielst das Partyspiel "Silent Imposter" auf Deutsch.
Kategorie: ${category}.
Es gibt mehrere Spieler. Jeder Crewmate kennt das geheime Wort. Der Imposter kennt nur einen vagen Hinweis und muss bluffen, ohne aufzufliegen.
Jeder Spieler gibt pro Runde EINEN sehr kurzen Hinweis (max. 6 Wörter), der das Wort beschreibt, ohne es zu nennen.
- Lies die bisherigen Hinweise GENAU, besonders den Hinweis des menschlichen Spielers, und reagiere darauf:
  * Als Crewmate: knüpfe thematisch an, bestätige subtil, oder ergänze einen neuen Aspekt — niemals das Wort nennen, keine direkten Synonyme.
  * Als Imposter: analysiere, was die anderen gesagt haben, und passe deinen Bluff daran an, damit er glaubwürdig zum Thema passt. Sei vage, aber konsistent.
- Falls ein Hinweis verdächtig wirkt (zu vage oder unpassend), darfst du als Crewmate vorsichtig misstrauisch klingen.
- Wiederhole keine vorherigen Hinweise. Antworte NUR mit dem Hinweistext, ohne Anführungszeichen, ohne Namen, ohne Erklärung.`;

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
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
