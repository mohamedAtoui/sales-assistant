import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { searchPubMed } from '@/lib/pubmed/api';

const inputSchema = z.object({
  query: z
    .string()
    .describe(
      'Requête de recherche PubMed en anglais (ex: "magnesium l-threonate cognitive function")'
    ),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Nombre maximum de résultats à retourner (1-10)'),
});

type PubMedToolInput = z.infer<typeof inputSchema>;

export const pubmedSearchTool = tool({
  description: `Recherche des articles scientifiques sur PubMed (base de données médicale NCBI).
Utilise cet outil quand tu as besoin de trouver des études récentes, de vérifier des informations scientifiques,
ou de fournir des références à jour sur le magnésium, le sommeil, les fonctions cognitives, ou tout autre sujet médical.
Retourne les PMID, titres, auteurs, journaux et résumés des articles trouvés.`,
  inputSchema: zodSchema(inputSchema),
  execute: async ({ query, maxResults }: PubMedToolInput) => {
    try {
      const results = await searchPubMed(query, maxResults);

      if (results.length === 0) {
        return {
          success: false,
          message: 'Aucun article trouvé pour cette recherche.',
          results: [],
        };
      }

      return {
        success: true,
        message: `${results.length} article(s) trouvé(s) sur PubMed.`,
        results: results.map((r) => ({
          pmid: r.pmid,
          title: r.title,
          authors: r.authors.slice(0, 3).join(', ') + (r.authors.length > 3 ? ' et al.' : ''),
          journal: r.journal,
          year: r.year,
          abstract: r.abstract.length > 500 ? r.abstract.substring(0, 500) + '...' : r.abstract,
          pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors de la recherche PubMed: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        results: [],
      };
    }
  },
});
