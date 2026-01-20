'use client';

import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PubMedResult {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  pubmedUrl: string;
}

interface CitationCardProps {
  result: PubMedResult;
}

export function CitationCard({ result }: CitationCardProps) {
  return (
    <Card className="mt-2 bg-gray-50 border-gray-200">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-start justify-between gap-2">
          <span className="text-blue-700">{result.title}</span>
          <a
            href={result.pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-600 flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-4 text-xs text-gray-600 space-y-1">
        <p>
          <span className="font-medium">Auteurs:</span> {result.authors}
        </p>
        <p>
          <span className="font-medium">Journal:</span> {result.journal} ({result.year})
        </p>
        <p>
          <span className="font-medium">PMID:</span>{' '}
          <a
            href={result.pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {result.pmid}
          </a>
        </p>
        {result.abstract && (
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-blue-600">
              Voir le résumé
            </summary>
            <p className="mt-1 text-gray-600 leading-relaxed">{result.abstract}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
