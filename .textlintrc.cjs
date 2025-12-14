module.exports = {
  filters: {},
  rules: {
    "textlint-rule-ja-space-between-half-and-full-width": false,
    "preset-ja-technical-writing": {
      "no-exclamation-question-mark": false,
      "no-mix-dearu-desumasu": false,
      "ja-no-mixed-period": {
        "allowPeriodMarks": ["："],
        "allowEmojiAtEnd": true,
      }
    },
    "spellcheck-tech-word": true,
  }
}