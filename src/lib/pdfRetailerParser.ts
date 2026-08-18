import * as pdfjsLib from 'pdfjs-dist';
import { Party, Route } from '../types';

// Configure worker safely for browser environment
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup fallback:', e);
  }
}

export interface ExtractedRetailerCandidate {
  tempId: string;
  shopNumber: string;
  shopName: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  address: string;
  area: string;
  landmark?: string;
  routeId: string;
  routeName: string;
  selected: boolean;
  validationStatus: 'VALID' | 'DUPLICATE_EXISTING' | 'DUPLICATE_IN_PDF' | 'WARNING_PHONE' | 'WARNING_NAME';
  validationMessage: string;
  confidenceScore: number; // 0 to 100
  originalRawSnippet?: string;
}

/**
 * Extract clean area name from route name
 * e.g. "Morabadi Route" -> "Morabadi"
 * e.g. "Marwari Beat" -> "Marwari"
 * e.g. "Bariatu Route" -> "Bariatu"
 */
export function extractRouteArea(routeName: string): string {
  if (!routeName) return 'Local';
  const cleaned = routeName
    .replace(/\s*(?:route|beat|market|plan|sector|circle|ward|zone)\s*$/i, '')
    .replace(/^\s*(?:route|beat|market|plan)\s*/i, '')
    .trim();
  return cleaned || routeName;
}

/**
 * Extract full text and positional lines from an uploaded PDF file
 * Accurately clusters items by row and detects table column spacing via X coordinates.
 */
export async function extractTextLinesFromPdf(file: File): Promise<{ fullText: string; lines: string[] }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const allLines: string[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = (textContent.items as any[]).filter(
        (item) => item && typeof item.str === 'string' && item.str.trim().length > 0
      );

      // Group items by approximate Y coordinate (line clustering within 4px)
      const lineMap = new Map<number, any[]>();
      items.forEach((item) => {
        const y = Math.round((item.transform ? item.transform[5] : 0) / 4) * 4;
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item);
      });

      // Higher Y is higher on the page in PDF coordinate system
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

      sortedY.forEach((y) => {
        const lineItems = lineMap.get(y)!;
        // Sort items left-to-right (transform[4] is X)
        lineItems.sort((a, b) => (a.transform?.[4] || 0) - (b.transform?.[4] || 0));

        let rowStr = '';
        for (let i = 0; i < lineItems.length; i++) {
          const it = lineItems[i];
          const str = it.str;
          if (i > 0) {
            const prev = lineItems[i - 1];
            const prevEndX = (prev.transform?.[4] || 0) + (prev.width || 0);
            const currStartX = it.transform?.[4] || 0;
            const gap = currStartX - prevEndX;
            if (gap > 16) {
              // Large gap indicates a table column break
              rowStr += '\t';
            } else if (gap > 1) {
              rowStr += ' ';
            }
          }
          rowStr += str;
        }

        const trimmedRow = rowStr.trim();
        if (trimmedRow.length > 0) {
          allLines.push(trimmedRow);
          fullText += trimmedRow + '\n';
        }
      });
    }

    return { fullText, lines: allLines };
  } catch (error) {
    console.error('PDF Text extraction error:', error);
    throw new Error('Failed to parse PDF file. Please ensure it is a valid PDF document with selectable text.');
  }
}

/**
 * Extract Indian phone numbers from text and return clean phone + text without phone
 */
export function extractPhonesFromText(text: string): { phones: string[]; cleanText: string } {
  const phones: string[] = [];
  let cleanText = text;

  // Patterns for Indian mobile and landline numbers
  const phonePatterns = [
    /(?:(?:\+91|91|0)[ -]?)?([6-9]\d{9})\b/g,
    /(?:(?:\+91|91|0)[ -]?)?([6-9]\d{4})[ -](\d{5})\b/g,
    /(?:(?:\+91|91|0)[ -]?)?([6-9]\d{2})[ -](\d{3})[ -](\d{4})\b/g,
  ];

  phonePatterns.forEach((rg) => {
    let match;
    while ((match = rg.exec(text)) !== null) {
      const rawDigits = match[0].replace(/\D/g, '');
      const cleanDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
      if (cleanDigits.length === 10 && !phones.includes(cleanDigits)) {
        phones.push(cleanDigits);
      }
    }
  });

  // Strip phone prefix labels and digits from cleanText
  cleanText = cleanText
    .replace(/(?:mob(?:ile)?|ph(?:one)?|contact|tel|m|no)\s*[:.\-]?\s*(?:\+91|91|0)?[ -]?[6-9]\d{2,4}[ -]?\d{3,5}\b/gi, ' ')
    .replace(/(?:(?:\+91|91|0)[ -]?)?[6-9]\d{9}\b/g, ' ')
    .replace(/(?:(?:\+91|91|0)[ -]?)?[6-9]\d{4}[ -]\d{5}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { phones, cleanText };
}

/**
 * Check if a line is a table header or document metadata
 */
export function isHeaderOrMetadataLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower.length === 0) return true;

  // If line contains an Indian phone number, it's definitely a data row, not a header
  if (/(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/.test(line)) {
    return false;
  }

  const headerKeywords = [
    'retailer name',
    'outlet name',
    'shop name',
    'store name',
    'party name',
    'customer name',
    'phone number',
    'mobile number',
    'mobile no',
    'contact no',
    'contact number',
    'address',
    'location',
    'beat name',
    'route name',
    'sl no',
    'serial no',
    's.no',
    'sr.no',
    'sr no',
    'mother dairy',
    'distributor',
    'route list',
    'beat plan',
    'daily visit',
    'outlet list',
    'page no',
    'total outlets',
    'total shops',
    'sales officer',
    'sales rep',
    'date:',
  ];

  return headerKeywords.some((kw) => lower === kw || (lower.includes(kw) && lower.length < 80 && !lower.includes('bhandar') && !lower.includes('store') && !lower.includes('grocery') && !lower.includes('dairy')));
}

/**
 * Separate Retailer Name and Address accurately
 */
export function separateNameAndAddress(
  rawText: string,
  defaultArea: string
): { shopName: string; address: string } {
  // Strip leading serial number e.g. "1.", "01.", "1)", "[1]", "1 -"
  let working = rawText.replace(/^\s*(?:\d+[\.\-\)\:]|[A-Z]\d+[\.\-\)\:])\s*/, '').trim();

  // Remove any trailing commas, pipes, dashes
  working = working.replace(/^[,\-:|]+/, '').replace(/[,\-:|]+$/, '').trim();

  // Check 1: Tab / Pipe / Semicolon column separated
  if (working.includes('\t') || working.includes('|') || working.includes(';')) {
    const parts = working
      .split(/[\t|;]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length >= 1) {
      const namePart = parts[0];
      const addressPart = parts.slice(1).join(', ').trim();
      return {
        shopName: namePart,
        address: addressPart || `${defaultArea}, Ranchi`,
      };
    }
  }

  // Check 2: Comma separated e.g. "Munna Bhandar, Near Durga Mandir, Morabadi"
  if (working.includes(',')) {
    const parts = working
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length >= 1) {
      const namePart = parts[0];
      const addressPart = parts.slice(1).join(', ').trim();
      return {
        shopName: namePart,
        address: addressPart || `${defaultArea}, Ranchi`,
      };
    }
  }

  // Check 3: Dash separated with spaces e.g. "Shanti Grocery and Cosmetic - Morabadi Chowk"
  if (working.includes(' - ') || working.includes(' – ')) {
    const parts = working
      .split(/\s+[-–]\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length >= 1) {
      const namePart = parts[0];
      const addressPart = parts.slice(1).join(', ').trim();
      return {
        shopName: namePart,
        address: addressPart || `${defaultArea}, Ranchi`,
      };
    }
  }

  // Check 4: Address keyword boundary detection
  // Common address prepositions & location indicators in Ranchi / FMCG beat lists
  const words = working.split(/\s+/);
  if (words.length <= 3) {
    // Short name like "Munna Bhandar" or "Shanti Dairy" with no address in line
    return {
      shopName: working,
      address: `${defaultArea}, Ranchi`,
    };
  }

  // Look for address keyword starting at word index >= 1 (so shopName gets at least 1 word)
  const addressKeywords = [
    'near',
    'opp',
    'opposite',
    'beside',
    'behind',
    'infront',
    'at',
    'chowk',
    'mor',
    'more',
    'road',
    'rd',
    'marg',
    'path',
    'gali',
    'lane',
    'street',
    'sector',
    'plot',
    'holding',
    'ward',
    'nagar',
    'colony',
    'enclave',
    'vihar',
    'apartment',
    'complex',
    'market',
    'bazar',
    'bazaar',
    'haat',
    'stand',
    'station',
    'bridge',
    'pul',
    'ranchi',
    'thana',
    'mandir',
    'masjid',
    'church',
    'school',
    'college',
    'hospital',
    'tower',
    'building',
    'booth',
    // Key areas in Ranchi
    'morabadi',
    'bariatu',
    'marwari',
    'harmu',
    'doranda',
    'hinoo',
    'kokar',
    'lalpur',
    'kanke',
    'ratu',
    'dhurwa',
    'namkum',
    'chutia',
    'pandra',
    'argora',
  ];

  let addressSplitIndex = -1;

  for (let i = 1; i < words.length; i++) {
    const cleanWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (addressKeywords.includes(cleanWord)) {
      // If it's a preposition like 'near' or 'opp', definitely split here
      if (['near', 'opp', 'opposite', 'beside', 'behind', 'at', 'infront'].includes(cleanWord)) {
        addressSplitIndex = i;
        break;
      }
      // If it's an area word or 'road'/'chowk', and shop has at least 2 words, split here
      if (i >= 2) {
        addressSplitIndex = i;
        break;
      }
    }
  }

  if (addressSplitIndex > 0) {
    const namePart = words.slice(0, addressSplitIndex).join(' ').replace(/[,\-:|]+$/, '').trim();
    const addressPart = words.slice(addressSplitIndex).join(' ').replace(/^[,\-:|]+/, '').trim();
    return {
      shopName: namePart,
      address: addressPart || `${defaultArea}, Ranchi`,
    };
  }

  // If no clear address keyword, keep the complete text as the exact shop name
  return {
    shopName: working,
    address: `${defaultArea}, Ranchi`,
  };
}

/**
 * Heuristics and parser to extract structured retailers from raw text / PDF
 */
export function parseRetailersFromText(
  rawText: string,
  selectedRoute: Route,
  existingParties: Party[]
): ExtractedRetailerCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const defaultArea = extractRouteArea(selectedRoute.name);
  const candidates: ExtractedRetailerCandidate[] = [];

  // 1. Group multi-line records or single-line records
  let currentBlock: string[] = [];
  const rawBlocks: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isHeaderOrMetadataLine(line)) {
      continue;
    }

    const hasPhone = /(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/.test(line) || /[6-9]\d{4}\s*\d{5}\b/.test(line);
    const hasSerialPrefix = /^\s*(?:\d+[\.\-\)]|[A-Z]\d+[\.\-\)])\s+/.test(line);
    const isPipeOrTabSeparated = line.includes('|') || line.includes('\t') || line.includes(';');

    if (isPipeOrTabSeparated || hasSerialPrefix || (hasPhone && currentBlock.length > 0)) {
      if (currentBlock.length > 0) {
        rawBlocks.push([...currentBlock]);
        currentBlock = [];
      }
      currentBlock.push(line);
    } else {
      currentBlock.push(line);
      // If block has grown to 3 lines or has phone, flush
      if (currentBlock.length >= 3 && currentBlock.some((l) => /(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/.test(l))) {
        rawBlocks.push([...currentBlock]);
        currentBlock = [];
      }
    }
  }

  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  // Build flattened blocks to process
  const blocksToProcess: string[] = [];
  rawBlocks.forEach((block) => {
    const combined = block.join('  ');
    if (combined.trim().length > 2) {
      blocksToProcess.push(combined);
    }
  });

  // Fallback: If no blocks, evaluate individual lines
  if (blocksToProcess.length === 0) {
    lines.forEach((line) => {
      if (line.length > 3 && !isHeaderOrMetadataLine(line)) {
        blocksToProcess.push(line);
      }
    });
  }

  // Duplicate tracking sets within this PDF
  const seenPdfPhones = new Set<string>();
  const seenPdfNames = new Set<string>();

  let counter = 1;

  blocksToProcess.forEach((blockText) => {
    if (isHeaderOrMetadataLine(blockText) && !/(?:(?:\+91|0)?[ -]?)?[6-9]\d{9}\b/.test(blockText)) {
      return;
    }

    // 1. Extract Phone Numbers
    const { phones, cleanText } = extractPhonesFromText(blockText);
    const phone = phones.length > 0 ? phones[0] : '';
    const altPhone = phones.length > 1 ? phones[1] : '';

    // 2. Extract Exact Shop Name and Address
    const { shopName: rawShopName, address: rawAddress } = separateNameAndAddress(cleanText, defaultArea);

    let shopName = rawShopName.replace(/[,\-:|]+$/, '').replace(/^[,\-:|]+/, '').trim();
    let address = rawAddress.replace(/[,\-:|]+$/, '').replace(/^[,\-:|]+/, '').trim();

    // Clean any owner parentheses from shopName if present, but keep ownerName empty per spec
    shopName = shopName.replace(/\(([^)]+)\)/, '').trim();

    // Owner Name is intentionally left blank per user instructions
    const ownerName = '';

    // Area is automatically set to the route area (e.g. "Morabadi" for "Morabadi Route")
    const area = defaultArea;

    if (!address || address.length < 2) {
      address = `${defaultArea}, Ranchi`;
    }

    // Discard invalid / empty names
    if (!shopName || shopName.length < 2 || shopName.toLowerCase() === 'null' || shopName.toLowerCase() === 'undefined') {
      return;
    }

    let confidenceScore = 80;
    if (phone) confidenceScore += 15;
    if (address && address !== `${defaultArea}, Ranchi`) confidenceScore += 5;

    // 3. Validation & Duplicate Checking
    let validationStatus: ExtractedRetailerCandidate['validationStatus'] = 'VALID';
    let validationMessage = phone ? 'Ready to import' : 'Ready to import (No phone number)';

    const normPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const normName = shopName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check existing stores in DB by Phone
    const existingMatchByPhone = normPhone
      ? existingParties.find((p) => p.active && p.phone && p.phone.replace(/\D/g, '').slice(-10) === normPhone)
      : null;

    // Check existing stores in DB by Name on this Route
    const existingMatchByName = existingParties.find(
      (p) =>
        p.active &&
        (p.routeId === selectedRoute.id || p.routeName === selectedRoute.name) &&
        p.shopName.toLowerCase().replace(/[^a-z0-9]/g, '') === normName
    );

    if (existingMatchByPhone) {
      validationStatus = 'DUPLICATE_EXISTING';
      validationMessage = `Phone ${phone} already registered to "${existingMatchByPhone.shopName}" (${existingMatchByPhone.routeName})`;
      confidenceScore = 30;
    } else if (existingMatchByName) {
      validationStatus = 'DUPLICATE_EXISTING';
      validationMessage = `Store "${existingMatchByName.shopName}" already exists on ${selectedRoute.name}`;
      confidenceScore = 40;
    } else if (normPhone && seenPdfPhones.has(normPhone)) {
      validationStatus = 'DUPLICATE_IN_PDF';
      validationMessage = `Duplicate phone (${phone}) appears multiple times in this PDF`;
      confidenceScore = 35;
    } else if (seenPdfNames.has(normName)) {
      validationStatus = 'DUPLICATE_IN_PDF';
      validationMessage = `Duplicate store "${shopName}" appears multiple times in this PDF`;
      confidenceScore = 45;
    }

    if (normPhone) seenPdfPhones.add(normPhone);
    if (normName) seenPdfNames.add(normName);

    const candidate: ExtractedRetailerCandidate = {
      tempId: `import_${Date.now()}_${counter}_${Math.random().toString(36).substring(2, 6)}`,
      shopNumber: `SH-${100 + existingParties.length + counter}`,
      shopName,
      ownerName, // Blank by default
      phone: phone || '', // Phone or empty
      altPhone,
      address, // Exact extracted address
      area, // Route area (e.g. "Morabadi")
      landmark: '',
      routeId: selectedRoute.id,
      routeName: selectedRoute.name,
      selected: validationStatus === 'VALID',
      validationStatus,
      validationMessage,
      confidenceScore: Math.max(10, Math.min(100, confidenceScore)),
      originalRawSnippet: blockText,
    };

    candidates.push(candidate);
    counter++;
  });

  return candidates;
}
