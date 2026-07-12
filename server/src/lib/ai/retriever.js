import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { getLiveStockQuote, getCompanyFinancials, getCompanyNews } from "../../tools/apiClients.js";

// Custom Embeddings class to fall back to when GEMINI_API_KEY is not present or offline
class FakeEmbeddings {
  async embedDocuments(documents) {
    return documents.map(() => new Array(768).fill(0));
  }
  async embedQuery(query) {
    return new Array(768).fill(0);
  }
}

export async function retrieveStockContext(ticker, query) {
  if (!ticker) return [];

  try {
    const cleanTicker = ticker.toUpperCase().trim();
    
    // 1. Fetch live metrics dynamically
    const quote = await getLiveStockQuote(cleanTicker);
    const financials = await getCompanyFinancials(cleanTicker);
    const news = await getCompanyNews(cleanTicker);

    // 2. Prepare documents
    const docs = [];

    // Ticker quote document
    docs.push(new Document({
      pageContent: `Stock Ticker: ${quote.symbol} (${quote.name}).
Price: $${quote.price}. Change: ${quote.change} (${quote.percentChange}%).
Sector: ${quote.sector}. Market Capitalization: $${quote.cap.toLocaleString()}.
Valuation & Profitability: P/E Ratio: ${quote.pe}, P/B Ratio: ${quote.pb}, ROE (Return on Equity): ${(quote.roe * 100).toFixed(1)}%, ROCE: ${(quote.roce * 100).toFixed(1)}%, Debt to Equity: ${quote.debtEq}, EPS: $${quote.eps}, Dividend Yield: ${(quote.divYield * 100).toFixed(2)}%.
Balance Sheet: Cash reserves: $${quote.cash.toLocaleString()}, Outstanding Debt: $${quote.debt.toLocaleString()}, Annual Revenue: $${quote.revenue.toLocaleString()}, Net Income: $${quote.netIncome.toLocaleString()}, Geo Location: ${quote.geo}.`,
      metadata: { type: "quote", ticker: cleanTicker }
    }));

    // Financials document
    if (financials && financials.length > 0) {
      financials.forEach(f => {
        docs.push(new Document({
          pageContent: `Historical financial details for ${cleanTicker} in year ${f.year}:
Revenue: $${f.revenue.toLocaleString()}, Net Income: $${f.netIncome.toLocaleString()}, Operating Income: $${f.operatingIncome.toLocaleString()}, EBITDA: $${f.ebitda.toLocaleString()}, EPS: $${f.eps}, Total Assets: $${f.totalAssets.toLocaleString()}, Total Liabilities: $${f.totalLiabilities.toLocaleString()}, Total Equity: $${f.totalEquity.toLocaleString()}, Cash: $${f.cash.toLocaleString()}, Debt: $${f.debt.toLocaleString()}, Free Cash Flow: $${f.freeCashFlow.toLocaleString()}.`,
          metadata: { type: "financials", year: f.year, ticker: cleanTicker }
        }));
      });
    }

    // Headlines
    if (news && news.length > 0) {
      news.forEach((n, i) => {
        docs.push(new Document({
          pageContent: `Headlines for ${cleanTicker}: Title: "${n.title}". Source: ${n.source}. Sentiment: ${n.sentiment >= 0.25 ? "Bullish" : n.sentiment <= -0.25 ? "Bearish" : "Neutral"} (score: ${n.sentiment}). Summary: ${n.summary}`,
          metadata: { type: "news", index: i, ticker: cleanTicker }
        }));
      });

      // Aggregate News Sentiment
      const sentimentScore = news.reduce((acc, item) => acc + item.sentiment, 0) / news.length;
      const sentimentRating = sentimentScore >= 0.25 ? "Bullish" : sentimentScore <= -0.25 ? "Bearish" : "Neutral";
      docs.push(new Document({
        pageContent: `Aggregated news sentiment for ${cleanTicker}: Rating: ${sentimentRating}, Average Sentiment Score: ${sentimentScore.toFixed(2)} (scale -1 to 1).`,
        metadata: { type: "sentiment", ticker: cleanTicker }
      }));
    }

    // 3. Initialize Vector Store
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const embeddings = geminiKey 
      ? new GoogleGenerativeAIEmbeddings({ apiKey: geminiKey, modelName: "embedding-001" }) 
      : new FakeEmbeddings();

    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

    // 4. Retrieve documents matching query
    const results = await vectorStore.similaritySearch(query, 3);
    return results;
  } catch (error) {
    console.error("Error retrieving stock context:", error);
    return [];
  }
}
