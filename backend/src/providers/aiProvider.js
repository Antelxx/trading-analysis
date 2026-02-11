const axios = require("axios");
const http = require("http");
const https = require("https");

function buildStubAnalysis({ rules }) {
  const overall =
    rules.trend === "up" || rules.trend === "down" ? "trend" : "range";

  return {
    overall,
    forces: "多空力量在当前周期出现分化，需等待进一步确认。",
    timeframes: {
      "1h信号": "单周期信息有限，需结合其他周期。",
      "1day趋势": "长期背景尚不明确，需等待结构确认。"
    },
    risk: "结构尚未形成一致信号，存在节奏错配风险。",
    rationale: "当前更适合观察与等待，以避免在结构未确认时做出激进行为。",
    action_hint: rules.risk_level === "high" ? "wait" : "watch",
    short_term_bias: "短期方向尚不清晰，建议以结构为主。",
    long_term_trend: "长期趋势未形成共识，需等待均线结构确认。",
    overall_view: "短期与长期信号一致性不足，当前以观察为主。",
    execution_logic: "以等待与观察为主，避免在结构未确认时主动出击。",
    risk_level: rules.risk_level === "high" ? "高" : rules.risk_level === "medium" ? "中" : "低"
  };
}

const GEMINI_BASE_URL =
  process.env.AI_STUDIO_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

function buildGeminiPrompt({ input }) {
  return {
    contents: [
      {
        parts: [
          {
            text: buildSystemPrompt() + "\n输入数据：\n" + JSON.stringify(input)
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

function buildSystemPrompt() {
  const mode = (process.env.AI_MODE || "public").toLowerCase();
  const base =
    "你是一位资深的量化交易员，基于‘多周期均线(MA)与量价关系’进行结构解读。请严格执行以下逻辑：\n" +
    "1. 核心逻辑：以日线作为月度趋势背景，1h 级别刻画日内波动节奏。若价格在日线 MA60 下方，所有向上交叉均视为‘反弹’而非‘反转’。\n" +
    "2. 验证标准：观察价格突破均线时成交量是否同步放大，若缩量则在 risk 中提示‘诱多风险’。\n" +
    "3. 字段要求：只输出 JSON，严禁预测未来涨跌，严禁给出买卖建议。必须包含字段：long_term_trend, short_term_bias, overall_view, execution_logic, risk_level, overall, forces, timeframes, risk, rationale, action_hint。\n" +
    "4. 约束：risk_level 只能是 低/中/高；action_hint 只能是 wait/watch/cautious。\n" +
    "5. timeframes 仅允许包含 1h 与 1day 的描述，禁止出现 4h 或其他周期。\n" +
    "6. 禁止暴露内部字段名或规则键（如 volume_confirm、price_distance 等），必须改写为自然语言。\n" +
    "7. 语言：输出内容必须使用中文，不允许出现英文单词（MA7/MA25/MA60、1H/1D 等专业缩写除外）。\n";
  if (mode === "personal") {
    return (
      base +
      "表达可以更直接明确，但仍只做结构/趋势/风险解读，不得给出预测与交易建议。"
    );
  }
  return (
    base +
    "语气克制，强调不确定性与风险。"
  );
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
        const maxTokens = Number(process.env.AI_STUDIO_MAX_TOKENS || 600);

        const payload = {
          model,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt()
            },
            { role: "user", content: JSON.stringify(input) }
          ],
          temperature: 0.2,
          max_tokens: maxTokens
        };

        const requestConfig = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          timeout: timeoutMs,
          httpAgent: new http.Agent({ keepAlive: false }),
          httpsAgent: new https.Agent({ keepAlive: false })
        };

        let data;
        try {
          const res = await axios.post(`${baseUrl}/chat/completions`, payload, requestConfig);
          data = res.data;
        } catch (err) {
          if (err.code === "ECONNRESET") {
            const res = await axios.post(`${baseUrl}/chat/completions`, payload, requestConfig);
            data = res.data;
          } else {
            throw err;
          }
        }

        const text = data?.choices?.[0]?.message?.content || "";
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          // Try to extract JSON from a mixed response
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("AI response is not valid JSON");
          parsed = JSON.parse(match[0]);
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
