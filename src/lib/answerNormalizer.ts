/**
 * تطبيع الإجابات العربية — دوال نقية بلا أي اعتماد على الواجهة.
 *
 * القواعد:
 *  - إزالة التشكيل والتطويل (ـ)
 *  - توحيد أ / إ / آ / ٱ إلى ا
 *  - توحيد ة إلى ه (يقبل «القاهرة» و«القاهره»)
 *  - توحيد ى إلى ي
 *  - إزالة علامات الترقيم والمسافات الزائدة
 *  - تحويل الأرقام العربية الهندية إلى لاتينية
 */

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const PUNCTUATION = /[.,!?؟،؛:؛"'«»()\-_/\\[\]{}~`^%$#@*+=|<>]/g;

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function normalizeArabic(input: string): string {
  return input
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] ?? d)
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** إزالة «ال» التعريف من بداية كل كلمة — للمقارنة المتساهلة */
export function stripAlLam(normalized: string): string {
  return normalized
    .split(' ')
    .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ');
}

/** مسافة ليفنشتاين لقبول خطأ إملائي واحد في الكلمات الطويلة */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * هل الإجابة المكتوبة صحيحة؟
 * تقارن مع الإجابة الرسمية وكل الصيغ المقبولة بعد التطبيع،
 * ثم تتساهل بإسقاط «ال» وبخطأ إملائي واحد للإجابات الطويلة.
 */
export function isAnswerCorrect(
  userInput: string,
  answer: string,
  acceptedAnswers: string[] = [],
): boolean {
  const user = normalizeArabic(userInput);
  if (!user) return false;

  const candidates = [answer, ...acceptedAnswers].map(normalizeArabic);

  for (const c of candidates) {
    if (!c) continue;
    if (user === c) return true;
    if (stripAlLam(user) === stripAlLam(c)) return true;
    // خطأ إملائي واحد مقبول في الإجابات ذات 5 أحرف فأكثر
    if (c.length >= 5 && levenshtein(stripAlLam(user), stripAlLam(c)) <= 1) return true;
  }
  return false;
}
