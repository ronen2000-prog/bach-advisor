// מנוע ההתאמה של יועץ התמציות - פורט נאמן של backend/advisor_engine.py.
// הלוגיקה, מילות המפתח, שאלות ההבהרה והנוסחים בעברית זהים בתו לתו למקור
// הפייתוני. הערות על סטיות מכוונות (אם יש) מסומנות בהערות "DEVIATION".
(function (global) {
  "use strict";

  var flowersMod = (typeof module !== "undefined" && module.exports)
    ? require("./bach-flowers.js")
    : (global.BachApp && global.BachApp.flowers);
  var BY_KEY = flowersMod.BY_KEY;

  var MIN_QUESTIONS = 2;
  var MAX_QUESTIONS = 6;
  var MIN_REMEDIES_IN_BLEND = 4;
  var MAX_REMEDIES_IN_BLEND = 6;

  // מילות מפתח בעברית לכל תמצית - זהות למקור, כולל סדר ההופעה (משפיע על
  // סדר איתחול scores וסדר ה-tie-break היציב במיון).
  var REMEDY_KEYWORDS = {
    rock_rose: ["פאניקה", "אימה", "בהלה", "חירום", "מבועת", "טרור", "מזועזע", "נבהל"],
    mimulus: ["ביישן", "ביישנות", "פוביה", "פחד ממשהו", "פחד מ", "חושש מ", "פחד ממוקד", "פחד ידוע", "פחד מחיות", "פחד מחושך", "פחד מרופא שיניים", "פחד לדבר בציבור", "פחד ממחלה"],
    cherry_plum: ["לאבד שליטה", "דחפים", "מחשבות מפחיד", "לפגוע במישהו", "להתפרץ", "מפחד מעצמו", "קרוב להתמוטטות", "פחד לאבד שפיות"],
    aspen: ["מעורפל", "לא מוסבר", "תחושת רוע", "בלי סיבה ברורה", "מתח בלתי מזוהה", "לא ברור למה", "פחד מהלא נודע", "פחד פתאומי", "מתעורר בלילה בפחד"],
    red_chestnut: ["דואג לילדים", "דואג לבעל", "דואג לאשתו", "פחד שיקרה להם", "דאגה מוגזמת לאחרים", "חרד לשלום", "חדל לדאוג לעצמו", "מצפה שמשהו רע יקרה למישהו אחר"],

    cerato: ["לא סומך על עצמו", "מתייעץ עם כולם", "מחקה אחרים", "צריך אישור מ", "יודע מה הוא רוצה אבל מחפש עצה"],
    scleranthus: ["התלבטות", "מתלבט", "בין שתי אפשרויות", "תנודות מצב רוח", "נושא את הקושי לבד", "לא מדבר על ההתלבטות שלו"],
    gentian: ["מתייאש בקלות", "ספקנות", "פסימי", "התייאשות מהיר", "מרים ידיים בקלות", "מדוכא כשדברים לא הולכים כמצופה"],
    gorse: ["חוסר תקווה", "אין סיכוי", "התייאש לגמרי", "ויתר על המאבק", "אין אור בקצה המנהרה"],
    hornbeam: ["עייפות נפשית", "דחיינות", "אין כוח להתחיל", "לא מסוגל להתחיל", "עייף לפני שמתחיל", "עייפות של יום ראשון בבוקר", "העייפות נעלמת ברגע שמתחילים"],
    wild_oat: ["חוסר כיוון", "חסר מטרה", "לא יודע מה לעשות בחיים", "מבולבל לגבי העתיד", "הגיע לצומת בחיים", "לא מצליח להחליט מה לעשות בחיים"],

    clematis: ["חלימה בהקיץ", "מנותק", "מרחף", "לא מרוכז", "בורח למחשבות", "חי בעולם משלו", "משתוקק לזמנים טובים בלי לפעול"],
    honeysuckle: ["געגוע לעבר", "תקוע בעבר", "נוסטלגיה", "מתגעגע", "מרגיש שהימים הטובים מאחוריו"],
    wild_rose: ["אדישות", "אדיש", "חוסר מוטיבציה", "ויתור פסיבי", "נכנע לנסיבות", "חיים מונוטוניים"],
    olive: ["תשישות מוחלט", "מותש", "אין כוחות", "מיצוי", "עייפות פיזית ונפשית", "אין יותר כוח למאמץ", "חיי היום יום עבודה קשה בלי הנאה"],
    white_chestnut: ["מחשבות טורדניות", "מחשבות חוזרות", "לא מפסיק לחשוב", "רעש מחשבתי", "לא נותנות לישון", "מחשבות שרצות במעגל", "מחשבות סחור סחור"],
    mustard: ["עצבות פתאומית", "ענן שחור", "דיכאון ללא סיבה", "עצבות בלי סיבה", "דיכאון שמופיע משום מקום ונעלם"],
    chestnut_bud: ["חוזר על אותן טעויות", "לא לומד מהניסיון", "אותה טעות שוב", "נופל שוב באותו דפוס"],

    water_violet: ["מעדיף להיות לבד", "מסתגר", "שומר מרחק", "קשה לו לשתף", "שומר על פרטיותו", "לא כופה את דעתו על אחרים", "רגוע ובעל ידע"],
    impatiens: ["חוסר סבלנות", "חסר סבלנות", "ממהר", "מתעצבן מהר", "לחוץ בקצב", "פועל וחושב מהר"],
    heather: ["צריך תשומת לב", "לא יכול להיות לבד", "מדבר על עצמו", "זקוק לחברה כל הזמן", "מרוכז בעצמו", "מדברן"],

    agrimony: ["מסתיר מצוקה", "חזות עליזה", "מעמיד פנים שהכול בסדר", "מחייך למרות הכאב", "מחפש חברה כדי לברוח מהצרות", "לא אוהב להיות לבד עם המחשבות שלו"],
    centaury: ["לא יודע לסרב", "לא יודעת לסרב", "כנוע", "קשה לו לומר לא", "מזניח את עצמו למען אחרים", "מאפשר לאחרים להעמיס עליו", "מעט כוח רצון", "מתכחש לרצונות שלו", "ריצוי", "מרצה אחרים", "מנסה לרצות"],
    walnut: ["קושי בשינוי", "מעבר חיים", "לא מסתגל", "רגיש ללחץ חברתי", "בתקופת מעבר", "מושפע בקלות מדעות של אחרים", "נסחף מהתלהבות של אחרים", "מתוסכל כשמוסטים ממטרתו"],
    holly: ["כעס", "קנאה", "חשד", "שנאה", "תוקפנות", "עוין", "מזג רע", "לב קשה", "קשה לו לפתוח את הלב לאהבה"],

    larch: ["חוסר ביטחון עצמי", "מצפה לכישלון", "פחד להיכשל", "לא מספיק טוב", "לא מאמין ביכולת", "לא ינסה כי בטוח שייכשל", "תחושת נחיתות"],
    pine: ["אשמה", "מאשים את עצמו", "מתנצל כל הזמן", "ביקורת עצמית", "חושב שיכל לעשות טוב יותר גם כשהצליח", "לוקח אחריות גם על טעויות של אחרים"],
    elm: ["עומס רגעי", "יותר מדי אחריות", "קורס מעומס", "מוצף מאחריות", "מוכרע תחת נטל העבודה", "מאבד זמנית אמון בעצמו"],
    sweet_chestnut: ["ייאוש קיצוני", "קצה גבול היכולת", "מיצוי מוחלט", "ייסורים קשים", "מצוקה נורא", "אין אור בקצה המנהרה", "קצה גבול הסבל"],
    star_of_bethlehem: ["הלם", "טראומה", "אחרי אירוע קשה", "עדיין מושפע מהאירוע", "לא התאוששה מהאירוע", "לא התאושש מהאירוע", "מסרב להתנחם"],
    willow: ["מרירות", "תחושת קורבן", "עוול", "מאשים נסיבות", "רחמים עצמיים", "מרחם על עצמו", "שופט את החיים לפי הצלחה", "מרגיש שלא היה ראוי לצרה כזו"],
    oak: ["לא מוותר", "לא מבקש עזרה", "מתמיד עד כלות", "ממשיך למרות הכול", "ממשיך ללכת לא משנה מה", "מתעלם מהעייפות שלו"],
    crab_apple: ["גועל עצמי", "אובססיה לניקיון", "מרגיש מלוכלך", "מתמקד בפגם קטן", "דימוי גוף ירוד"],

    chicory: ["אהבה תובענית", "דורש תשומת לב", "מתערב יותר מדי", "שתלטנית ברגש", "נותן כדי לקבל בחזרה", "מצפה שאחרים יתאימו עצמם אליו", "נודניק"],
    vervain: ["התלהבות יתר", "קנאי לרעיון", "לא מצליח להירגע", "לא יודע לוותר", "רוצה להמיר את כולם להשקפתו"],
    vine: ["שתלטן", "מכתיב לאחרים", "רודני", "דורש ציות", "לא מקבל דעה אחרת", "תאב שליטה", "בז לרגשות כחולשה", "בטוח בהצלחתו גם כשחולה", "נוקשות", "נוקשה"],
    beech: ["ביקורתי", "לא סובלני", "מבקר אחרים", "מזלזל באחרים", "לא מוצא את הטוב באחרים", "לא מוכן לפשרות", "שחור ולבן", "הכול או כלום", "ראייה קיצונית"],
    rock_water: ["נוקשות עצמית", "נוקשות", "פרפקציוניסט", "מסרב להנאה", "מחמיר עם עצמו", "מונע מעצמו הנאות", "רוצה להיות דוגמה לאחרים", "שחור ולבן", "הכול או כלום"],
  };

  // שאלות הבהרה קבועות, כל אחת מסייעת להבחין בין תמציות בתוך אותה קבוצה רגשית.
  var CLARIFYING_QUESTIONS = [
    { text: "האם הפחד מתמקד במשהו ספציפי וידוע (למשל מצב, חיה או מחלה מסוימת), או שהוא מעורפל וללא מקור ברור?", keys: ["mimulus", "aspen"] },
    { text: "האם עולה חשש מאיבוד שליטה עצמית, ממחשבות שמפחידות את המטופל בעצמו, או שמדובר בפחד ממשהו חיצוני?", keys: ["cherry_plum", "mimulus", "aspen"] },
    { text: "האם הדאגה מופנית בעיקר כלפי אנשים קרובים (למשל ילדים או בן/בת זוג), יותר מאשר כלפי המטופל עצמו?", keys: ["red_chestnut"] },
    { text: "האם המטופל נוטה להתייעץ עם כולם ולא סומך על שיפוט עצמו, או שהקושי הוא בעיקר בהחלטה בין שתי אפשרויות עם תנודות מצב רוח?", keys: ["cerato", "scleranthus"] },
    { text: "האם מדובר בייאוש קל וזמני אחרי אירוע מסוים, או בתחושת חוסר תקווה עמוקה וממושכת?", keys: ["gentian", "gorse"] },
    { text: "האם הקושי הוא בעיקר עייפות נפשית וחוסר חשק להתחיל משימות, לעומת חוסר כיוון כללי לגבי מה לעשות בחיים?", keys: ["hornbeam", "wild_oat"] },
    { text: "האם יש נטייה לברוח במחשבות ולהתנתק מההווה, לעומת קושי להשתחרר מזיכרונות וגעגוע לעבר?", keys: ["clematis", "honeysuckle"] },
    { text: "האם מדובר בתשישות פיזית ונפשית מוחלטת אחרי תקופה ממושכת וקשה, או בעצבות שיורדת פתאום בלי סיבה ברורה?", keys: ["olive", "mustard"] },
    { text: "האם יש מחשבות חוזרות וטורדניות שקשה להשתיק, במיוחד בשעות הלילה?", keys: ["white_chestnut"] },
    { text: "האם המטופל מעדיף להתבודד ולשמור מרחק רגשי, או שהוא זקוק מאוד לתשומת לב וקשה לו להיות לבד?", keys: ["water_violet", "heather"] },
    { text: "האם יש חוסר סבלנות בולט ותסכול מקצב אחרים, שגורם למטופל למהר או לעשות הכול לבד?", keys: ["impatiens"] },
    { text: "האם המטופל נוטה להסתיר מצוקה מאחורי חיוך וחזות עליזה כלפי חוץ?", keys: ["agrimony"] },
    { text: "האם קשה למטופל לסרב לבקשות ולעמוד על שלו מול אחרים?", keys: ["centaury"] },
    { text: "האם מדובר בקושי להסתגל לשינוי או מעבר משמעותי בחיים?", keys: ["walnut"] },
    { text: "האם עולים כעס, קנאה או חשדנות כלפי אחרים?", keys: ["holly"] },
    { text: "האם המטופל נמנע מלנסות דברים כי הוא מצפה מראש לכישלון ומרגיש לא מספיק טוב?", keys: ["larch"] },
    { text: "האם יש נטייה להאשים את עצמו ולהתנצל, גם כשהוא לא אשם?", keys: ["pine"] },
    { text: "האם מדובר בתחושת עומס זמנית מאחריות גדולה אצל אדם שבדרך כלל מתפקד היטב, או בייאוש עמוק וממושך שמרגיש כמו קצה גבול היכולת?", keys: ["elm", "sweet_chestnut"] },
    { text: "האם יש רקע של אירוע מטלטל, הלם או טראומה שעדיין משפיע על המטופל?", keys: ["star_of_bethlehem"] },
    { text: "האם יש תחושת מרירות, עוול או האשמת הנסיבות/אחרים במצבו?", keys: ["willow"] },
    { text: "האם המטופל ממשיך להתאמץ ולהתמיד למרות תשישות, בלי לבקש עזרה או לוותר?", keys: ["oak"] },
    { text: "האם המטופל נותן אהבה או תמיכה תוך ציפייה מובלעת לקבל תשומת לב בתמורה, ונוטה להתערב יותר מדי בחיי הקרובים לו?", keys: ["chicory"] },
    { text: "האם יש התלהבות עזה ונאמנות לרעיון או מטרה, עד כדי קושי להירגע ולוותר?", keys: ["vervain"] },
    { text: "האם המטופל נוטה להיות שתלטן ולדרוש שאחרים ינהגו בדיוק כפי שהוא רואה לנכון?", keys: ["vine"] },
    { text: "האם המטופל ביקורתי כלפי אחרים וקשה לו לקבל התנהגות שונה משלו?", keys: ["beech"] },
    { text: "האם המטופל נוקשה כלפי עצמו, פרפקציוניסט, ומסרב לאפשר לעצמו הנאה או גמישות?", keys: ["rock_water"] },
  ];

  // מילות שלילה: אם מילת מפתח מופיעה מיד אחרי אחת מהן ("לא מרגיש פחד"), לא
  // סופרים אותה כהתאמה חיובית.
  var NEGATION_MARKERS = { "לא": true, "אין": true, "בלי": true, "בלתי": true, "ללא": true };

  function _isNegated(text, matchStart) {
    var start = Math.max(0, matchStart - 25);
    var prefix = text.slice(start, matchStart).trim();
    if (!prefix) return false;
    var words = prefix.split(/\s+/);
    var recentWords = words.slice(Math.max(0, words.length - 3));
    return recentWords.some(function (w) { return NEGATION_MARKERS.hasOwnProperty(w); });
  }

  // מחזיר את מילות המפתח שיש להן לפחות הופעה אחת לא-שלילית בטקסט. שימוש
  // בחיפוש תת-מחרוזת פשוט (כמו str.find בפייתון) - אין כאן regex/word-boundary
  // במקור, ולכן גם לא בפורט.
  function _positiveKeywords(fullText, keywords) {
    var matched = [];
    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i];
      var start = 0;
      while (true) {
        var idx = fullText.indexOf(kw, start);
        if (idx === -1) break;
        if (!_isNegated(fullText, idx)) {
          matched.push(kw);
          break;
        }
        start = idx + 1;
      }
    }
    return matched;
  }

  function _scoreRemedies(fullText) {
    var scores = {};
    Object.keys(REMEDY_KEYWORDS).forEach(function (key) {
      var hits = _positiveKeywords(fullText, REMEDY_KEYWORDS[key]).length;
      if (hits) scores[key] = hits;
    });
    return scores;
  }

  function _collectText(initialDescription, transcript) {
    var parts = [initialDescription];
    transcript.forEach(function (e) {
      if (e.type === "answer") parts.push(e.text);
    });
    return parts.join(" \n");
  }

  // משלים את ההרכב לפחות ל-MIN_REMEDIES_IN_BLEND תמציות, מעדיף לגוון בין
  // קבוצות רגשיות שונות במקום לערום עוד תמציות מאותה קבוצה שכבר יוצגה.
  function _padToMinBlend(chosenKeys) {
    var result = chosenKeys.slice();
    var usedGroups = new Set(result.map(function (k) { return BY_KEY[k].group_he; }));
    var allKeys = Object.keys(REMEDY_KEYWORDS);

    for (var i = 0; i < allKeys.length; i++) {
      if (result.length >= MIN_REMEDIES_IN_BLEND) break;
      var key = allKeys[i];
      if (result.indexOf(key) !== -1) continue;
      if (!usedGroups.has(BY_KEY[key].group_he)) {
        result.push(key);
        usedGroups.add(BY_KEY[key].group_he);
      }
    }

    for (var j = 0; j < allKeys.length; j++) {
      if (result.length >= MIN_REMEDIES_IN_BLEND) break;
      var k2 = allKeys[j];
      if (result.indexOf(k2) === -1) result.push(k2);
    }

    return result;
  }

  function _buildRemedyEntries(chosenKeys, fullText) {
    return chosenKeys.map(function (key) {
      var flower = BY_KEY[key];
      var matched = _positiveKeywords(fullText, REMEDY_KEYWORDS[key]);
      var reason;
      if (matched.length) {
        var terms = matched.join("', '");
        reason = "המאפיין המרכזי של " + flower.name_he + " (שייכת לקבוצת " + flower.group_he + "): " + flower.keynote + " " +
          "בתיאור ובתשובות שנאספו על המטופל עלו הביטויים: '" + terms + "' - התאמה ישירה למאפיין הזה, ולכן התמצית נכללה בהרכב.";
      } else {
        reason = "המאפיין המרכזי של " + flower.name_he + " (שייכת לקבוצת " + flower.group_he + "): " + flower.keynote + " " +
          "לא עלתה עדות ישירה לכך בתיאור או בתשובות - התמצית נכללה כתמיכה משלימה כדי לתת מענה רחב יותר להרכב, ולא בגלל ביטוי ספציפי שנאמר.";
      }
      return { key: key, name_he: flower.name_he, name_en: flower.name_en, reason: reason };
    });
  }

  function _usageInstructionsText() {
    return "הכינו בקבוקון (30 מ״ל) עם מים מינרליים, והוסיפו 2 טיפות מכל תמצית שנבחרה. " +
      "יש ליטול 4 טיפות מהתערובת ישירות מהבקבוקון, 4 פעמים ביום (ניתן גם לפני האוכל). " +
      "מומלץ להעריך מחדש את ההרכב לאחר כ-3-4 שבועות.";
  }

  function _fallbackProposal() {
    var chosen = _padToMinBlend(["white_chestnut"]);
    var remedies = _buildRemedyEntries(chosen, "");
    return {
      type: "proposal",
      remedies: remedies,
      general_notes: "לא זוהה דפוס רגשי ממוקד מהמידע שנמסר, ולכן הוצע הרכב תמיכה כללי. מומלץ לתשאל את המטופל שוב בפירוט רב יותר בפעם הבאה.",
      usage_instructions: _usageInstructionsText(),
    };
  }

  // מיון יורד יציב לפי ניקוד, זהה סמנטית ל-sorted(scores.items(), key=lambda kv: -kv[1])
  // של פייתון (יציב, שומר על סדר ה-insertion המקורי בין שוויונות).
  function _sortedScoreItems(scores) {
    var items = Object.keys(scores).map(function (k) { return [k, scores[k]]; });
    items.sort(function (a, b) { return b[1] - a[1]; });
    return items;
  }

  function next_step(initialDescription, historyContext, transcript) {
    // הערה: historyContext מתקבל כפרמטר אך אינו בשימוש בגוף הפונקציה - זהו
    // התנהגות מקורית זהה של backend/advisor_engine.py (המשתנה לא נצרך שם
    // בפועל), ולכן משוחזר נאמנה כאן.
    var fullText = _collectText(initialDescription, transcript);
    var scores = _scoreRemedies(fullText);
    var questionsAskedCount = transcript.filter(function (e) { return e.type === "question"; }).length;
    var askedTexts = new Set(transcript.filter(function (e) { return e.type === "question"; }).map(function (e) { return e.text; }));

    var sortedItems = _sortedScoreItems(scores);
    var topScore = sortedItems.length ? sortedItems[0][1] : 0;
    var threshold = Math.max(1, topScore - 1);
    var leadingKeys = new Set(sortedItems.filter(function (kv) { return kv[1] >= threshold; }).map(function (kv) { return kv[0]; }));

    var enoughSignal = topScore >= 2 && leadingKeys.size <= 4;
    var mustStop = questionsAskedCount >= MAX_QUESTIONS;
    var canStop = questionsAskedCount >= MIN_QUESTIONS && enoughSignal;

    if (!mustStop && !canStop) {
      var question = _pickQuestion(leadingKeys, askedTexts);
      if (question) {
        return { type: "question", text: question };
      }
    }

    return _finalizeWithText(scores, fullText);
  }

  function _pickQuestion(leadingKeys, askedTexts) {
    for (var i = 0; i < CLARIFYING_QUESTIONS.length; i++) {
      var q = CLARIFYING_QUESTIONS[i];
      if (askedTexts.has(q.text)) continue;
      if (leadingKeys.size > 0 && q.keys.some(function (k) { return leadingKeys.has(k); })) {
        return q.text;
      }
    }

    if (leadingKeys.size === 0) {
      for (var j = 0; j < CLARIFYING_QUESTIONS.length; j++) {
        var q2 = CLARIFYING_QUESTIONS[j];
        if (!askedTexts.has(q2.text)) return q2.text;
      }
    }

    return null;
  }

  function _finalizeWithText(scores, fullText) {
    if (Object.keys(scores).length === 0) {
      return _fallbackProposal();
    }

    var sortedItems = _sortedScoreItems(scores);
    var chosen = sortedItems.map(function (kv) { return kv[0]; }).slice(0, MAX_REMEDIES_IN_BLEND);
    if (chosen.length < MIN_REMEDIES_IN_BLEND) {
      chosen = _padToMinBlend(chosen);
    }

    var remedies = _buildRemedyEntries(chosen, fullText);

    return {
      type: "proposal",
      remedies: remedies,
      general_notes: _buildAnalysisParagraph(chosen, fullText),
      usage_instructions: _usageInstructionsText(),
    };
  }

  function _buildAnalysisParagraph(chosenKeys, fullText) {
    var directKeys = chosenKeys.filter(function (k) { return _positiveKeywords(fullText, REMEDY_KEYWORDS[k]).length > 0; });
    var paddedKeys = chosenKeys.filter(function (k) { return directKeys.indexOf(k) === -1; });

    if (directKeys.length === 0) {
      return "לא זוהתה תמונה רגשית ממוקדת מהמידע שנמסר, ולכן הוצע הרכב תמיכה כללי. " +
        "מומלץ לאסוף תיאור מפורט יותר של המטופל בהזדמנות הבאה.";
    }

    var groupOrder = [];
    var groups = {};
    directKeys.forEach(function (k) {
      var g = BY_KEY[k].group_he;
      if (!groups.hasOwnProperty(g)) {
        groups[g] = [];
        groupOrder.push(g);
      }
      groups[g].push(k);
    });

    var clauses = groupOrder.map(function (groupName) {
      var keys = groups[groupName];
      var names = keys.map(function (k) { return BY_KEY[k].name_he; }).join(" ו");
      var terms = [];
      keys.forEach(function (k) {
        _positiveKeywords(fullText, REMEDY_KEYWORDS[k]).forEach(function (term) {
          if (terms.indexOf(term) === -1) terms.push(term);
        });
      });
      var termsStr = terms.join("', '");
      return "בתחום " + groupName + " בולטים הביטויים '" + termsStr + "', המתאימים ל" + names;
    });

    var paragraph = clauses.join("; ") + ".";

    if (paddedKeys.length) {
      var padNames = paddedKeys.map(function (k) { return BY_KEY[k].name_he; }).join(", ");
      paragraph += " בנוסף נכללו בהרכב " + padNames + " כתמיכה משלימה להיבטים רגשיים נלווים, " +
        "גם ללא עדות ישירה מפורשת עבורן בתיאור או בתשובות.";
    }

    return paragraph;
  }

  var QUESTION_MARKERS = ["למה", "מדוע", "מה הסיבה", "על שום מה"];

  function explain_if_asked(message, currentRemedies) {
    if (!currentRemedies || !currentRemedies.length) return null;
    if (!QUESTION_MARKERS.some(function (marker) { return message.indexOf(marker) !== -1; })) return null;

    var lowerMsg = message.toLowerCase();
    var mentioned = currentRemedies.filter(function (r) {
      return message.indexOf(r.name_he) !== -1 || lowerMsg.indexOf(r.name_en.toLowerCase()) !== -1;
    });
    if (!mentioned.length) return null;

    var parts = mentioned.map(function (r) { return r.name_he + " (" + r.name_en + "): " + r.reason; });
    return "תשובה לשאלתכם על ההרכב:\n\n" + parts.join("\n\n");
  }

  function has_signal(text) {
    return Object.keys(_scoreRemedies(text)).length > 0;
  }

  function build_history_context(pastSessions) {
    var saved = pastSessions.filter(function (s) { return s.status === "saved" && s.final_remedies; });
    if (!saved.length) return "";

    var lines = ["היסטוריית מפגשים קודמים עם מטופל זה:"];
    saved.forEach(function (s) {
      var names = s.final_remedies.map(function (r) { return r.name_he; }).join(", ");
      lines.push("- מפגש מתאריך " + s.created_at.slice(0, 10) + ": הרכב שניתן - " + names + ".");
      if (s.practitioner_notes) {
        lines.push("  הערות המטפל/ת: " + s.practitioner_notes);
      }
    });
    return lines.join("\n");
  }

  var api = {
    MIN_QUESTIONS: MIN_QUESTIONS,
    MAX_QUESTIONS: MAX_QUESTIONS,
    MIN_REMEDIES_IN_BLEND: MIN_REMEDIES_IN_BLEND,
    MAX_REMEDIES_IN_BLEND: MAX_REMEDIES_IN_BLEND,
    REMEDY_KEYWORDS: REMEDY_KEYWORDS,
    CLARIFYING_QUESTIONS: CLARIFYING_QUESTIONS,
    next_step: next_step,
    explain_if_asked: explain_if_asked,
    has_signal: has_signal,
    build_history_context: build_history_context,
    // חשופים גם לצורך בדיקות פנימיות
    _positiveKeywords: _positiveKeywords,
    _scoreRemedies: _scoreRemedies,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.engine = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
