function buildStubAnalysis({ rules }) {
  const overall =
    rules.trend === "up" || rules.trend === "down" ? "trend" : "range";

  return {
    overall,
    forces: "多空力量在当前周期出现分化，需等待进一步确认。",
    timeframes: {
      "1h": { state: "unclear", focus: "单周期信息有限，需结合其他周期。" },
      "4h": { state: "unclear", focus: "单周期信息有限，需结合其他周期。" },
      "1day": { state: "unclear", focus: "单周期信息有限，需结合其他周期。" }
    },
    risk: "结构尚未形成一致信号，存在节奏错配风险。",
    rationale: "当前更适合观察与等待，以避免在结构未确认时做出激进行为。",
    action_hint: rules.risk_level === "high" ? "wait" : "watch"
  };
}

const axios = require("axios");

const GEMINI_BASE_URL =
  process.env.AI_STUDIO_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

function buildGeminiPrompt({ input }) {
  return {
    contents: [
      {
        parts: [
          {
            text:
              "你是资深的行情结构分析助手。必须遵守：不预测涨跌，不给买卖点或交易建议。" +
              "仅基于给定数据输出结构化判断，不引入外部指标或信息。" +
              "只输出 JSON，且必须包含字段：overall, forces, timeframes, risk, rationale, action_hint。" +
              "action_hint 只能是 wait/watch/cautious。\n" +
              "输入数据：\n" +
              JSON.stringify(input)
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: Number(process.env.AI_STUDIO_MAX_TOKENS || 600)
    }
  };
}

function createAiProvider() {
  const provider = (process.env.AI_PROVIDER || "stub").toLowerCase();

  if (provider === "stub") {
    return {
      name: "stub",
      analyze: async ({ rules }) => buildStubAnalysis({ rules })
    };
  }

  if (provider === "aistudio") {
    return {
      name: "aistudio",
      analyze: async ({ input }) => {
        const apiKey = process.env.AI_STUDIO_API_KEY;
        if (!apiKey) throw new Error("AI_STUDIO_API_KEY missing");

        const model = process.env.AI_STUDIO_MODEL || "gemini-2.0-flash";
        const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;

        const timeoutMs = Number(process.env.AI_STUDIO_TIMEOUT_MS || 45000);
        let data;
        try {
          const res = await axios.post(url, buildGeminiPrompt({ input }), {
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": apiKey
            },
            timeout: timeoutMs
          });
          data = res.data;
        } catch (err) {
          // One retry for transient timeouts
          if (err.code === "ECONNABORTED") {
            const res = await axios.post(url, buildGeminiPrompt({ input }), {
              headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKey
              },
              timeout: timeoutMs
            });
            data = res.data;
          } else {
            throw err;
          }
        }

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error("AI response is not valid JSON");
        }

        return parsed;
      }
    };
  }

  if (provider === "deepseek") {
    return {
      name: "deepseek",
      analyze: async ({ input }) => {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");
        const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
        const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
        const timeoutMs = Number(process.env.AI_STUDIO_TIMEOUT_MS || 45000);

        const { data } = await axios.post(
          `${baseUrl}/chat/completions`,
          {
            model,
            messages: [
              {
                role: "system",
                content:
                  "你是资深的行情结构分析助手。必须遵守：不预测涨跌，不给买卖点或交易建议。" +
                  "仅基于给定数据输出结构化判断，不引入外部指标或信息。" +
                  "只输出 JSON，且必须包含字段：overall, forces, timeframes, risk, rationale, action_hint。" +
                  "action_hint 只能是 wait/watch/cautious。"
              },
              { role: "user", content: JSON.stringify(input) }
            ],
            temperature: 0.2,
            max_tokens: Number(process.env.AI_STUDIO_MAX_TOKENS || 600)
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            timeout: timeoutMs
          }
        );

        const text = data?.choices?.[0]?.message?.content || "";
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error("AI response is not valid JSON");
        }
        return parsed;
      }
    };
  }

  if (provider === "gemini_proxy") {
    return {
      name: "gemini_proxy",
      analyze: async ({ input }) => {
        const proxyUrl = process.env.GEMINI_PROXY_URL;
        if (!proxyUrl) throw new Error("GEMINI_PROXY_URL missing");
        const timeoutMs = Number(process.env.AI_STUDIO_TIMEOUT_MS || 45000);

        const { data } = await axios.post(
          proxyUrl,
          buildGeminiPrompt({ input }),
          {
            headers: { "Content-Type": "application/json" },
            timeout: timeoutMs
          }
        );

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error("AI response is not valid JSON");
        }
        return parsed;
      }
    };
  }

  if (provider === "gemini_cf") {
    return {
      name: "gemini_cf",
      analyze: async ({ input }) => {
        const proxyUrl = process.env.CF_GEMINI_PROXY_URL;
        if (!proxyUrl) throw new Error("CF_GEMINI_PROXY_URL missing");
        const timeoutMs = Number(process.env.AI_STUDIO_TIMEOUT_MS || 45000);

        const { data } = await axios.post(
          proxyUrl,
          buildGeminiPrompt({ input }),
          {
            headers: { "Content-Type": "application/json" },
            timeout: timeoutMs
          }
        );

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          throw new Error("AI response is not valid JSON");
        }
        return parsed;
      }
    };
  }

  return {
    name: "stub",
    analyze: async ({ rules }) => buildStubAnalysis({ rules })
  };
}

module.exports = { createAiProvider };
