# AI 行情结构分析（非自动交易）

这是一个面向个人使用的行情结构分析系统，强调**规则驱动**与**可解释性**：  
不预测涨跌、不提供买卖点，只做趋势结构、均线系统与风险提示。

## 为什么做这个项目
我从前端转向「AI + 全栈 / 工程方向」，希望用一个完整项目证明自己具备：  
数据接入 → 指标计算 → 规则评估 → AI 解读 → 前端可视化 的工程能力。

## 系统架构
- 前端：Vue3 + Vite + Lightweight Charts  
- 后端：Node.js + Express  
- 数据源：
  - 美股/ETF：Alpha Vantage
  - 黄金 OHLC：Twelve Data（XAU/USD）
- AI：
  - 统一抽象接口 `AI_PROVIDER`
  - 可切换 AI Studio / 其他模型

数据流向：  
行情数据 → K 线与指标 → 规则评估 → AI 结构解读 → 前端展示

## 功能说明（MVP）
- K 线图 + MA7/MA25/MA60 + 成交量
- 规则驱动的结构判断（趋势方向、均线排列、偏离、量能配合）
- AI 输出结构化分析（非预测、非买卖点）
- 多资产切换（美股 ETF / 黄金）
- 周期切换（1小时 / 4小时 / 1天）

## 技术栈
- 前端：Vue3、Vite、Lightweight Charts
- 后端：Node.js、Express、Axios
- AI：AI Studio（可替换）
- 数据：Alpha Vantage / Twelve Data

## 使用方式
### 1) 启动后端
```
cd backend
npm install
npm run dev
```

`.env` 示例：
```
ALPHAVANTAGE_API_KEY=你的key
TWELVEDATA_API_KEY=你的key
AI_PROVIDER=aistudio
AI_STUDIO_API_KEY=你的key
AI_STUDIO_TIMEOUT_MS=45000
AI_STUDIO_MAX_TOKENS=600
```

### 2) 启动前端
```
cd frontend
npm install
npm run dev
```

如需修改后端地址，设置 `frontend/.env`：
```
VITE_API_BASE=http://localhost:3000/api
```

## 风险声明（非投资建议）
本项目仅用于行情结构研究与学习目的，**不预测涨跌**、**不提供买卖点**。  
任何输出都不构成投资建议，请自行判断并承担风险。

