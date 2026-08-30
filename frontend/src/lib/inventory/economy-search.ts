import { CS2EconomyItem } from "@ianlucas/cs2-lib";
import { getItemSearchNames, parseItemName } from "./economy-naming.ts";

type SearchableItem = Pick<CS2EconomyItem, "id" | "name" | "modelKey" | "isBase">;

interface SearchDocument {
  weapon: string;
  skin: string;
  fullName: string;
  officialNames: string[];
  model: string;
  candidateTokens: string[];
}

const searchDocumentCache = new WeakMap<object, SearchDocument>();

/**
 * Normalizes user input without relying on an alias list for individual weapons.
 * Accents, spaces and punctuation are intentionally ignored, so `ak47`,
 * `AK-47`, and `ak 47` describe the same search term.
 */
function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(value: string): string {
  return value.replace(/\s/g, "");
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + Number(left[row - 1] !== right[column - 1]),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function isSimilar(queryToken: string, candidateToken: string): boolean {
  if (queryToken.length < 3 || candidateToken.length < 3) return false;
  if (candidateToken.startsWith(queryToken) || candidateToken.includes(queryToken)) return true;

  const maximumDistance = queryToken.length <= 4 ? 1 : Math.floor(queryToken.length / 3);
  return editDistance(queryToken, candidateToken) <= maximumDistance;
}

function getSearchDocument(item: SearchableItem): SearchDocument {
  const cached = searchDocumentCache.get(item);
  if (cached) return cached;

  const parsed = parseItemName(item);
  const weapon = normalize(parsed.weaponName);
  const skin = normalize(parsed.skinName);
  const fullName = normalize(parsed.fullName);
  const officialNames = getItemSearchNames(item).map(normalize);
  const model = normalize(item.modelKey);
  const document = {
    weapon,
    skin,
    fullName,
    officialNames,
    model,
    candidateTokens: [skin, weapon, fullName, model, ...officialNames]
      .flatMap((value) => value.split(" "))
      .filter(Boolean),
  };
  searchDocumentCache.set(item, document);
  return document;
}

function scoreItem(item: SearchableItem, query: string): number {
  const { weapon, skin, fullName, officialNames, model, candidateTokens } = getSearchDocument(item);
  const compactQuery = compact(query);

  if (skin.includes(query)) return 1_000;
  if (weapon.includes(query)) return 950;
  if (fullName.includes(query)) return 900;
  if (officialNames.some((value) => value.includes(query))) return 900;
  if ([skin, weapon, fullName, model, ...officialNames].some((value) => compact(value).includes(compactQuery))) return 850;

  const queryTokens = query.split(" ");
  const everyTokenMatches = queryTokens.every((queryToken) =>
    candidateTokens.some((candidateToken) => isSimilar(queryToken, candidateToken)),
  );

  return everyTokenMatches ? 700 : 0;
}

/**
 * Searches weapon and finish names with tolerant matching, then ranks the most
 * direct result first. The implementation is data-driven: it does not carry a
 * hand-maintained list of aliases such as weapon-specific spelling rules.
 */
export function searchEconomyItems<T extends SearchableItem>(items: readonly T[], input: string): T[] {
  const query = normalize(input);
  if (!query) return [...items];

  return items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name, "pt-BR"))
    .map((entry) => entry.item);
}
