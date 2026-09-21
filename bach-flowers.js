// מאגר 38 תמציות באך + Rescue Remedy, לפי שבעת הקבוצות הקלאסיות של ד"ר באך.
// פורט נאמן של backend/bach_flowers.py - אותם מפתחות, אותם שדות, אותו סדר,
// טקסט עברי זהה בתו לתו.
(function (global) {
  "use strict";

  var BACH_FLOWERS = [
    // פחד
    { key: "rock_rose", name_he: "רוק רוז", name_en: "Rock Rose", group_he: "פחד",
      keynote: "אימה או פאניקה עזה, מצבי חירום נפשיים, בהלה קיצונית." },
    { key: "mimulus", name_he: "מימולוס", name_en: "Mimulus", group_he: "פחד",
      keynote: "פחד ממשהו ידוע וממשי - חיות, מחלה, כאב, מצבים חברתיים; ביישנות." },
    { key: "cherry_plum", name_he: "צ'רי פלאם", name_en: "Cherry Plum", group_he: "פחד",
      keynote: "פחד לאבד שליטה, מחשבות או דחפים שמפחידים את בעליהם." },
    { key: "aspen", name_he: "אספן", name_en: "Aspen", group_he: "פחד",
      keynote: "חרדה מעורפלת, פחד בלתי מוסבר, תחושת רוע או סכנה בלתי מזוהה." },
    { key: "red_chestnut", name_he: "רד צ'סנאט", name_en: "Red Chestnut", group_he: "פחד",
      keynote: "דאגת יתר לשלום אנשים קרובים, פחד שיקרה להם רע." },

    // חוסר ודאות
    { key: "cerato", name_he: "צראטו", name_en: "Cerato", group_he: "חוסר ודאות",
      keynote: "חוסר ביטחון בשיפוט העצמי, נטייה להיוועץ ולחקות אחרים במקום להקשיב לעצמי." },
    { key: "scleranthus", name_he: "סקלרנתוס", name_en: "Scleranthus", group_he: "חוסר ודאות",
      keynote: "התלבטות בין שתי אפשרויות, חוסר יציבות במצב רוח, קושי להכריע." },
    { key: "gentian", name_he: "ג'נציאנה", name_en: "Gentian", group_he: "חוסר ודאות",
      keynote: "ייאוש קל בעקבות כישלון או מכשול, ספקנות, התייאשות מהירה." },
    { key: "gorse", name_he: "גורס", name_en: "Gorse", group_he: "חוסר ודאות",
      keynote: "ייאוש עמוק, תחושת חוסר תקווה, ויתור על אפשרות שיפור." },
    { key: "hornbeam", name_he: "הורנבים", name_en: "Hornbeam", group_he: "חוסר ודאות",
      keynote: "עייפות נפשית, תחושת \"לא מסוגל להתחיל\", דחיינות מתוך עייפות מדומה." },
    { key: "wild_oat", name_he: "ווילד אוט", name_en: "Wild Oat", group_he: "חוסר ודאות",
      keynote: "חוסר כיוון בחיים, קושי לבחור דרך או מקצוע למרות יכולות." },

    // חוסר עניין מספק בהווה
    { key: "clematis", name_he: "קלמטיס", name_en: "Clematis", group_he: "חוסר עניין בהווה",
      keynote: "ניתוק מההווה, חלימה בהקיץ, נטייה לברוח למחשבות על העתיד." },
    { key: "honeysuckle", name_he: "האניסאקל", name_en: "Honeysuckle", group_he: "חוסר עניין בהווה",
      keynote: "געגוע לעבר, קושי להשתחרר מזיכרונות או מתקופה שחלפה." },
    { key: "wild_rose", name_he: "ווילד רוז", name_en: "Wild Rose", group_he: "חוסר עניין בהווה",
      keynote: "אדישות, השלמה פסיבית עם המצב, חוסר מוטיבציה לשינוי." },
    { key: "olive", name_he: "אוליב", name_en: "Olive", group_he: "חוסר עניין בהווה",
      keynote: "תשישות מוחלטת, פיזית ונפשית, לאחר מאמץ או מצוקה ממושכים." },
    { key: "white_chestnut", name_he: "וויט צ'סנאט", name_en: "White Chestnut", group_he: "חוסר עניין בהווה",
      keynote: "מחשבות טורדניות וחוזרות שאי אפשר להשתיק, במיוחד לפני שינה." },
    { key: "mustard", name_he: "מסטרד", name_en: "Mustard", group_he: "חוסר עניין בהווה",
      keynote: "עצבות פתאומית וכבדה שיורדת בלי סיבה ברורה, כמו ענן שחור." },
    { key: "chestnut_bud", name_he: "צ'סנאט באד", name_en: "Chestnut Bud", group_he: "חוסר עניין בהווה",
      keynote: "חזרה על אותן טעויות, קושי ללמוד מניסיון העבר." },

    // בדידות
    { key: "water_violet", name_he: "ווטר ויולט", name_en: "Water Violet", group_he: "בדידות",
      keynote: "נסיגה חברתית, העדפת בדידות, קושי לשתף רגשות." },
    { key: "impatiens", name_he: "אימפיישנס", name_en: "Impatiens", group_he: "בדידות",
      keynote: "חוסר סבלנות, תסכול מקצב אחרים, נטייה למהר ולעשות הכול לבד." },
    { key: "heather", name_he: "הת'ר", name_en: "Heather", group_he: "בדידות",
      keynote: "צורך עז בתשומת לב ובשיתוף, קושי להיות לבד עם עצמו." },

    // רגישות יתר להשפעה
    { key: "agrimony", name_he: "אגרימוני", name_en: "Agrimony", group_he: "רגישות יתר להשפעה",
      keynote: "הסתרת מצוקה מאחורי חזות עליזה, בריחה מעימות פנימי." },
    { key: "centaury", name_he: "סנטאורי", name_en: "Centaury", group_he: "רגישות יתר להשפעה",
      keynote: "קושי לסרב, כניעות יתר לרצון אחרים על חשבון הצרכים העצמיים." },
    { key: "walnut", name_he: "וולנאט", name_en: "Walnut", group_he: "רגישות יתר להשפעה",
      keynote: "קושי בהסתגלות לשינוי או במעבר חיים, רגישות ללחץ חברתי." },
    { key: "holly", name_he: "הולי", name_en: "Holly", group_he: "רגישות יתר להשפעה",
      keynote: "כעס, קנאה, חשדנות או תחושת איום כלפי אחרים." },

    // ייאוש וייסורים
    { key: "larch", name_he: "לארץ'", name_en: "Larch", group_he: "ייאוש וייסורים",
      keynote: "חוסר ביטחון עצמי, ציפייה מראש לכישלון, הימנעות מניסיון." },
    { key: "pine", name_he: "פיין", name_en: "Pine", group_he: "ייאוש וייסורים",
      keynote: "אשמה עצמית מוגזמת, נטייה להתנצל ולהאשים את עצמו גם כשלא אשם." },
    { key: "elm", name_he: "אלם", name_en: "Elm", group_he: "ייאוש וייסורים",
      keynote: "תחושת עומס רגעית מול אחריות גדולה, אצל אדם מסוגל בדרך כלל." },
    { key: "sweet_chestnut", name_he: "סוויט צ'סנאט", name_en: "Sweet Chestnut", group_he: "ייאוש וייסורים",
      keynote: "ייאוש קיצוני, תחושת מיצוי מוחלט, קצה גבול היכולת הנפשית." },
    { key: "star_of_bethlehem", name_he: "סטאר אוף בת'להם", name_en: "Star of Bethlehem", group_he: "ייאוש וייסורים",
      keynote: "הלם וטראומה, גם כאלה שהשפעתם נמשכת זמן רב אחרי האירוע." },
    { key: "willow", name_he: "ווילו", name_en: "Willow", group_he: "ייאוש וייסורים",
      keynote: "מרירות, תחושת קורבנות ועוול, קושי לקחת אחריות על מצבו." },
    { key: "oak", name_he: "אוק", name_en: "Oak", group_he: "ייאוש וייסורים",
      keynote: "התמדה עד כלות הכוחות, קושי לוותר או לבקש עזרה גם כשצריך." },
    { key: "crab_apple", name_he: "קראב אפל", name_en: "Crab Apple", group_he: "ייאוש וייסורים",
      keynote: "תחושת טומאה או גועל עצמי, אובססיה לניקיון או לפרט קטן." },

    // דאגת יתר לרווחת הזולת
    { key: "chicory", name_he: "צ'יקורי", name_en: "Chicory", group_he: "דאגת יתר לזולת",
      keynote: "אהבה תובענית, שליטה ודרישה לתשומת לב בתמורה לנתינה." },
    { key: "vervain", name_he: "ורוויין", name_en: "Vervain", group_he: "דאגת יתר לזולת",
      keynote: "התלהבות יתר, קנאות לרעיון, קושי להירגע ולוותר." },
    { key: "vine", name_he: "ויין", name_en: "Vine", group_he: "דאגת יתר לזולת",
      keynote: "שליטנות, נוקשות, צורך להכתיב לאחרים כיצד לנהוג." },
    { key: "beech", name_he: "ביץ'", name_en: "Beech", group_he: "דאגת יתר לזולת",
      keynote: "ביקורתיות, אי סובלנות כלפי חולשות ושונות של אחרים." },
    { key: "rock_water", name_he: "רוק ווטר", name_en: "Rock Water", group_he: "דאגת יתר לזולת",
      keynote: "נוקשות עצמית קיצונית, פרפקציוניזם, סירוב להנאה או לגמישות." },
  ];

  var RESCUE_REMEDY = {
    key: "rescue_remedy", name_he: "רסקיו רמדי (תמצית החירום)", name_en: "Rescue Remedy",
    group_he: "תערובת חירום",
    keynote: "שילוב של רוק רוז, אימפיישנס, קלמטיס, סטאר אוף בת'להם וצ'רי פלאם, למצבי משבר, הלם או לחץ אקוטי חריג.",
  };

  var ALL_REMEDIES = BACH_FLOWERS.concat([RESCUE_REMEDY]);

  var BY_KEY = {};
  ALL_REMEDIES.forEach(function (r) { BY_KEY[r.key] = r; });

  function repertory_text_for_prompt() {
    var lines = [];
    var current_group = null;
    ALL_REMEDIES.forEach(function (r) {
      if (r.group_he !== current_group) {
        current_group = r.group_he;
        lines.push("\n## " + current_group);
      }
      lines.push("- " + r.name_he + " (" + r.name_en + "): " + r.keynote);
    });
    return lines.join("\n");
  }

  var api = {
    BACH_FLOWERS: BACH_FLOWERS,
    RESCUE_REMEDY: RESCUE_REMEDY,
    ALL_REMEDIES: ALL_REMEDIES,
    BY_KEY: BY_KEY,
    repertory_text_for_prompt: repertory_text_for_prompt,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.flowers = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
