export interface PubMedSearchResult {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  abstract: string;
  doi?: string;
}

export interface ESearchResult {
  esearchresult: {
    count: string;
    idlist: string[];
  };
}

export interface ESummaryResult {
  result: {
    [pmid: string]: {
      uid: string;
      pubdate: string;
      source: string;
      authors: Array<{ name: string }>;
      title: string;
      elocationid?: string;
    };
  };
}

export interface EFetchResult {
  PubmedArticleSet?: {
    PubmedArticle?: Array<{
      MedlineCitation?: {
        Article?: {
          Abstract?: {
            AbstractText?: string | Array<{ _: string }>;
          };
        };
      };
    }>;
  };
}
