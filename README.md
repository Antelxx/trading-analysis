# AI 行情结构分析（非自动交易）

这是一个强调“规则驱动 + 可解释输出”的行情结构分析系统，仅用于结构与风险解读，不做自动交易、不预测涨跌、不提供买卖点。

## 项目定位
- 面向个人日常研究与复盘
- 以均线结构与量价关系为核心
- 通过 AI 输出结构化中文解读

## 主要功能
- K 线与均线可视化：MA7 / MA25 / MA60（固定展示 1 小时周期）
- 结构化规则结论：趋势方向、均线结构、价格偏离度、量能确认、风险提示
- AI 综合解读：基于 1h（短期）+ 1day（长期）结构的中文总结
- 多品种切换：纳指 ETF（QQQ）与黄金（XAU/USD）

## 系统架构
- 前端：Vue 3 + Vite + Lightweight Charts
- 后端：Node.js + Express
- 数据源：Twelve Data（时间序列 K 线）
- AI：统一 Provider 抽象（DeepSeek / AI Studio / 代理 / Stub）

## 数据流（文本流程图）
```text
用户选择品种
        |
        v
前端请求后端 API
  - /api/market/kline
  - /api/market/indicators
  - /api/analysis/ai
        |
        v
后端拉取 1h 行情
        |
        v
计算指标（MA/趋势/量能）
        |
        v
规则评估（风险/结构/提示）
        |
        v
AI 解读（1h + 1day）
        |
        v
前端可视化与文案展示
```

## 使用方式
### 1) 启动后端
```bash
cd backend
npm install
npm run dev
```

`.env` 示例：
```bash
TWELVEDATA_API_KEY=你的key
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的key
AI_STUDIO_API_KEY=你的key
AI_STUDIO_TIMEOUT_MS=45000
AI_STUDIO_MAX_TOKENS=600
```

### 2) 启动前端
```bash
cd frontend
npm install
npm run dev
```

如需修改后端地址，配置 `frontend/.env`：
```bash
VITE_API_BASE=http://localhost:3000/api
```

## 免责声明（非投资建议）
本项目仅用于行情结构研究与学习，输出不构成任何投资建议，请自行判断并承担风险。
