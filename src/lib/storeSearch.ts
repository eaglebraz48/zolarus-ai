// Lightweight normalizer + URL builders for multiple stores
export function normalizeToEnglish(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s$-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildAmazonUrl(query: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=mateussousa-20`;
}
export function buildTargetUrl(query: string) {
  // Target uses searchTerm
  return `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
}
export function buildWalmartUrl(query: string) {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}

export function buildAllStores(raw: string, budget?: number) {
  const qn = normalizeToEnglish(raw);
  const withBudget = budget ? `${qn} under ${budget}` : qn;
  return {
    amazon: buildAmazonUrl(withBudget),
    target: buildTargetUrl(withBudget),
    walmart: buildWalmartUrl(withBudget),
  };
}
