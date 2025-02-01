import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

// Configure marked to hide backticks
marked.use({
  renderer: {
    code(code: string, infostring: string | undefined) {
      const validLanguage = hljs.getLanguage(infostring || "")
        ? infostring
        : "";
      const highlighted = validLanguage
        ? hljs.highlight(code, { language: validLanguage }).value
        : code;
      return `<pre><code class="hljs language-${
        validLanguage || "plaintext"
      }">${highlighted}</code></pre>`;
    },
  },
});

export { marked };
