import { PubMedSearchResult, ESearchResult, ESummaryResult } from './types';

const NCBI_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function searchPubMed(
  query: string,
  maxResults: number = 5
): Promise<PubMedSearchResult[]> {
  try {
    // Step 1: Search for PMIDs
    const searchUrl = `${NCBI_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      query
    )}&retmax=${maxResults}&retmode=json&sort=relevance`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.statusText}`);
    }

    const searchData: ESearchResult = await searchResponse.json();
    const pmids = searchData.esearchresult.idlist;

    if (pmids.length === 0) {
      return [];
    }

    // Step 2: Get summaries for the PMIDs
    const summaryUrl = `${NCBI_BASE_URL}/esummary.fcgi?db=pubmed&id=${pmids.join(
      ','
    )}&retmode=json`;

    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      throw new Error(`PubMed summary failed: ${summaryResponse.statusText}`);
    }

    const summaryData: ESummaryResult = await summaryResponse.json();

    // Step 3: Get abstracts
    const abstractUrl = `${NCBI_BASE_URL}/efetch.fcgi?db=pubmed&id=${pmids.join(
      ','
    )}&retmode=xml`;

    const abstractResponse = await fetch(abstractUrl);
    const abstractXml = await abstractResponse.text();

    // Parse abstracts from XML (simple regex extraction)
    const abstractMap = parseAbstracts(abstractXml);

    // Combine results
    const results: PubMedSearchResult[] = pmids
      .filter((pmid) => summaryData.result[pmid])
      .map((pmid) => {
        const summary = summaryData.result[pmid];
        const doi = summary.elocationid?.replace('doi: ', '') || undefined;

        return {
          pmid,
          title: summary.title || 'No title',
          authors: summary.authors?.map((a) => a.name) || [],
          journal: summary.source || 'Unknown journal',
          year: summary.pubdate?.split(' ')[0] || 'Unknown year',
          abstract: abstractMap[pmid] || 'Abstract not available',
          doi,
        };
      });

    return results;
  } catch (error) {
    console.error('PubMed API error:', error);
    throw error;
  }
}

function parseAbstracts(xml: string): Record<string, string> {
  const abstracts: Record<string, string> = {};

  // Simple regex to extract PMID and abstract pairs
  const articleRegex =
    /<PubmedArticle>[\s\S]*?<PMID[^>]*>(\d+)<\/PMID>[\s\S]*?<\/PubmedArticle>/g;
  const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;

  let articleMatch;
  while ((articleMatch = articleRegex.exec(xml)) !== null) {
    const pmid = articleMatch[1];
    const articleContent = articleMatch[0];

    const abstractParts: string[] = [];
    let abstractMatch;
    while ((abstractMatch = abstractRegex.exec(articleContent)) !== null) {
      // Clean up HTML tags and entities
      const text = abstractMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim();
      if (text) {
        abstractParts.push(text);
      }
    }

    abstracts[pmid] = abstractParts.join(' ') || 'Abstract not available';
  }

  return abstracts;
}

export async function fetchPaperByPmid(
  pmid: string
): Promise<PubMedSearchResult | null> {
  try {
    const results = await searchPubMed(`${pmid}[uid]`, 1);
    return results[0] || null;
  } catch (error) {
    console.error(`Failed to fetch paper ${pmid}:`, error);
    return null;
  }
}
