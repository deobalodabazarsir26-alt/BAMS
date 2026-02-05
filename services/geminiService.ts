/**
 * Deprecated: Use ifscService.ts instead for reliable banking data.
 * Keeping this file to prevent breaking existing imports if any remain,
 * but redirecting implementation to searchIFSC.
 */
import { searchIFSC } from './ifscService';
export { searchIFSC as searchIFSCViaGemini };