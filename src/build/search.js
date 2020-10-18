const path = require("path");
const fs = require("fs").promises;
const MiniSearch = require("minisearch");

/* These words are too common to provide any real search value. Ignoring them
 * improves search relevancy and reduces the index filesize. Use lowercase.
 */
const STOP_WORDS = {
  en: new Set(["halo", "and", "or", "not", "to", "at", "in", "a", "the", "be", "are", "is", "as", "its", "it", "this", "these", "any", "e", "g"]),
  es: new Set(["halo"]) //todo
};

async function buildSearchIndex(searchDocs, buildOpts) {
  //build a search index per-language
  const searchIndexes = {};
  searchDocs.forEach(searchDoc => {
    if (!searchIndexes[searchDoc.lang]) {
      searchIndexes[searchDoc.lang] = new MiniSearch({
        idField: "path",
        fields: ["title", "text", "keywords"],
        storeFields: ["title"],
        tokenize: (string, _fieldName) => {
          //customize tokenizer to allow underscores in token
          return string.split(/[\s\-\."'!?,;:\[\]\(\)\|\\><]+/);
        },
        processTerm: (term, _fieldName) => {
          term = term.toLowerCase();
          return STOP_WORDS[searchDoc.lang].has(term) ? null : term;
        },
        searchOptions: {
          boost: {title: 3, keywords: 2},
          fuzzy: 0.2
        }
      });
    }
    searchIndexes[searchDoc.lang].add(searchDoc);
  });

  //write each language's search index to JSON so it can be loaded in the user's browser
  await fs.mkdir(path.join(buildOpts.outputDir, "assets"), {recursive: true});
  await Promise.all(Object.entries(searchIndexes).map(async ([lang, searchIndex]) => {
    const jsonIndex = JSON.stringify(searchIndex.toJSON());
    await fs.writeFile(path.join(buildOpts.outputDir, "assets", `search-index_${lang}.json`), jsonIndex, "utf8");
  }));
}

module.exports = buildSearchIndex;
