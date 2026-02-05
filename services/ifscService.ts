export interface IFSCResult {
  bankName: string;
  branchName: string;
  ifsc: string;
}

/**
 * Fetches official bank and branch details from Razorpay's IFSC API.
 * This is preferred over LLMs for IFSC lookups as it provides 
 * live, verified data from official banking records.
 */
export const searchIFSC = async (ifsc: string): Promise<IFSCResult | null> => {
  if (!ifsc || ifsc.length !== 11) return null;

  try {
    const response = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`IFSC code ${ifsc} not found in Razorpay directory.`);
      }
      return null;
    }

    const data = await response.json();

    return {
      bankName: data.BANK.toUpperCase().trim(),
      branchName: data.BRANCH.trim(),
      ifsc: data.IFSC.toUpperCase().trim()
    };
  } catch (error) {
    console.error("Razorpay IFSC Search Error:", error);
    return null;
  }
};