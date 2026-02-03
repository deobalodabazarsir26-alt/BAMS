
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface IFSCResult {
  bankName: string;
  branchName: string;
  ifsc: string;
}

export const searchIFSCViaGemini = async (ifsc: string): Promise<IFSCResult | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for bank details for IFSC code: ${ifsc}. Provide the Bank Name and Branch Name.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING },
            branchName: { type: Type.STRING },
            ifsc: { type: Type.STRING }
          },
          required: ["bankName", "branchName", "ifsc"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as IFSCResult;
    }
    return null;
  } catch (error) {
    console.error("Gemini IFSC Search Error:", error);
    return null;
  }
};
