import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
const files = [
  'questions.ts',
  'extraKnowledge.ts',
  'extraArabicWorld.ts',
  'extraEntertainment.ts',
  'extraScienceMind.ts',
];

function literal(node) {
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  return undefined;
}

function readQuestion(node) {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'q') return;
  const object = node.arguments[0];
  if (!object || !ts.isObjectLiteralExpression(object)) return;
  const result = {};
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name.getText().replace(/^['"]|['"]$/g, '');
    result[name] = literal(property.initializer);
  }
  if (typeof result.id === 'string' && typeof result.text === 'string') return result;
}

async function loadQuestions() {
  const questions = [];
  for (const file of files) {
    const sourceText = await fs.readFile(path.join(dataDir, file), 'utf8');
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      const question = readQuestion(node);
      if (question) questions.push(question);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...new Map(questions.map((question) => [question.id, question])).values()];
}

const translatableKeys = ['text', 'answer', 'accepted', 'wrong', 'explanation', 'clues'];
const protectedText = (text) => !/[\u0600-\u06ff]/.test(text);

const separator = '\n␞\n';

async function translateBatch(texts, target) {
  if (texts.every((text) => !text || protectedText(text))) return texts;
  const protectedIndexes = new Map();
  const arabic = texts.filter((text, index) => {
    if (!text || protectedText(text)) {
      protectedIndexes.set(index, text);
      return false;
    }
    return true;
  });
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'ar');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', arabic.join(separator));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      const payload = await response.json();
      const translated = payload[0].map((part) => part[0]).join('').split(/\s*␞\s*/);
      if (translated.length !== arabic.length) throw new Error('Translation separator mismatch');
      let translatedIndex = 0;
      return texts.map((_, index) =>
        protectedIndexes.has(index) ? protectedIndexes.get(index) : translated[translatedIndex++].trim(),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error(`Translation failed (${target}): ${texts[0].slice(0, 80)}`);
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

function collectStrings(questions) {
  const strings = new Set();
  for (const question of questions) {
    for (const key of translatableKeys) {
      const value = question[key];
      if (Array.isArray(value)) value.forEach((item) => strings.add(item));
      else if (typeof value === 'string') strings.add(value);
    }
  }
  return [...strings];
}

const questions = await loadQuestions();
const strings = collectStrings(questions);
console.log(`Found ${questions.length} questions and ${strings.length} unique strings.`);

const dictionaries = {};
for (const locale of ['en', 'fr']) {
  const batches = Array.from({ length: Math.ceil(strings.length / 30) }, (_, index) =>
    strings.slice(index * 30, index * 30 + 30),
  );
  let completed = 0;
  const translatedBatches = await mapLimit(batches, 5, async (batch) => {
    const translated = await translateBatch(batch, locale);
    completed += batch.length;
    if (completed % 300 < batch.length) console.log(`${locale}: ${completed}/${strings.length}`);
    return translated;
  });
  const translations = translatedBatches.flat();
  dictionaries[locale] = new Map(strings.map((text, index) => [text, translations[index]]));
  dictionaries[locale].set('صح', locale === 'en' ? 'True' : 'Vrai');
  dictionaries[locale].set('خطأ', locale === 'en' ? 'False' : 'Faux');
}

function translateValue(value, dictionary) {
  if (Array.isArray(value)) return value.map((item) => dictionary.get(item) ?? item);
  return typeof value === 'string' ? (dictionary.get(value) ?? value) : undefined;
}

const localized = {};
for (const question of questions) {
  localized[question.id] = {};
  for (const locale of ['en', 'fr']) {
    const dictionary = dictionaries[locale];
    localized[question.id][locale] = {
      question_text: translateValue(question.text, dictionary),
      answer: translateValue(question.answer, dictionary),
      accepted_answers: translateValue(question.accepted ?? [], dictionary),
      wrong_answers: translateValue(question.wrong ?? [], dictionary),
      ...(question.explanation
        ? { explanation: translateValue(question.explanation, dictionary) }
        : {}),
      ...(question.clues ? { clues: translateValue(question.clues, dictionary) } : {}),
    };
  }
}

const banner = `// Generated by scripts/generate-question-translations.mjs.\n`;
const output = `${banner}import type { QuestionTranslationCatalog } from '../lib/localizeQuestions';\n\nexport const QUESTION_TRANSLATIONS: QuestionTranslationCatalog = ${JSON.stringify(localized, null, 2)};\n`;
await fs.writeFile(path.join(dataDir, 'questionTranslations.ts'), output, 'utf8');
console.log('Wrote src/data/questionTranslations.ts');
