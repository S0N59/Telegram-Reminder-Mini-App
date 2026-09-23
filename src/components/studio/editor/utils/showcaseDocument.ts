import { PostMedia, PostInlineButton } from '../types/editor';

/**
 * Telegram Rich Text Showcase Document
 * Contains all 21 items required to verify full Telegram Bot API 10.1+ / @RichTextDemoBot parity:
 * 1. Formatted text (Bold, Italic, Underline, Strikethrough)
 * 2. Custom emoji
 * 3. Spoiler
 * 4. Mathematical formula
 * 5. Date / timestamp
 * 6. Quote (Blockquote)
 * 7. Expandable quote
 * 8. Bullet list
 * 9. Checklist
 * 10. Ordered list
 * 11. Code block with language
 * 12. Image / photo
 * 13. Video
 * 14. Audio
 * 15. Map / location
 * 16. Table
 * 17. Pull quote
 * 18. Links
 * 19. Email
 * 20. Mention
 * 21. References / footnotes
 */

export const TELEGRAM_SHOWCASE_HTML = `
<h1>🚀 Telegram Rich Messages Showcase</h1>
<p>Official demonstration of full <b>Telegram Bot API 10.1+ Rich Messages</b> and <i>@RichTextDemoBot</i> parity:</p>

<h3>1. Typography & Inline Styles</h3>
<p>
  <b>Bold styling</b>, <i>italic nuance</i>, <u>underlined emphasis</u>, <s>strikethrough text</s>, and <mark>highlighted marker</mark>.
  Chemical formula subscript: H<sub>2</sub>O and Einstein's equation superscript: E = mc<sup>2</sup>.
</p>

<h3>2. Secret Spoilers & Native Emojis</h3>
<p>
  Classified intelligence: <tg-spoiler>Secret Telegram Rich Messages Payload! 🕵️‍♂️</tg-spoiler>
  Featured custom emojis: 🔥 ⚡ 💎 👑 🚀
</p>

<h3>3. Mathematical Formula</h3>
<div data-type="math-block" data-formula="\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}">$$ \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi} $$</div>

<h3>4. Timestamp, Mentions & Native Entities</h3>
<p>
  Global release broadcast on <a href="tg://time?t=1757851200">Sep 14, 2025 at 12:00 UTC</a>.
  Contact the channel administrator @RemigramBot or direct email: contact@remigram.app.
  Join the community bot command /start and track balance with $TON cashtag.
  Official citation verified<sup data-ref-id="1">[1]</sup>.
</p>

<h3>5. Quotes: Blockquote, Expandable & Pull Quote</h3>
<blockquote>Telegram standard blockquote with primary cyan accent line</blockquote>

<blockquote expandable>
  <p><b>Expandable Blockquote:</b> Tap to reveal full architecture specifications!</p>
  <p>Contains multiple nested paragraphs that fold and unfold natively in Telegram clients.</p>
</blockquote>

<blockquote data-type="pullquote" data-author="Telegram Bot API 10.1+">
  <p>Rich Messages deliver unmatched expressive power to modern Telegram creators.</p>
</blockquote>

<h3>6. Collapsible Details Block</h3>
<details data-title="⚡ Tap here to reveal architecture notes" open>
  <p>Collapsible details blocks allow tucking away extensive documentation or change logs cleanly.</p>
</details>

<h3>7. Task Checklist & Lists</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><input type="checkbox" checked/><div>Structured PostDocument schema active</div></li>
  <li data-type="taskItem" data-checked="true"><input type="checkbox" checked/><div>Telegram Bot API 10.1+ rich serializer verified</div></li>
  <li data-type="taskItem" data-checked="false"><input type="checkbox"/><div>Broadcast to linked channel or group</div></li>
</ul>

<ul>
  <li>Fast round-trip serialization</li>
  <li>Progressive disclosure toolbar UI</li>
</ul>

<ol>
  <li>Design schema model</li>
  <li>Serialize to InputRichMessage</li>
</ol>

<h3>8. Native Data Table</h3>
<table bordered>
  <tr>
    <th>Metric</th>
    <th>Standard Message</th>
    <th>Rich Message</th>
  </tr>
  <tr>
    <td>Char limit</td>
    <td>4,096</td>
    <td>32,768</td>
  </tr>
  <tr>
    <td>Table support</td>
    <td>❌</td>
    <td>✅ Native table</td>
  </tr>
  <tr>
    <td>Checklists</td>
    <td>❌</td>
    <td>✅ Native checklist</td>
  </tr>
</table>

<h3>9. Preformatted Code Block</h3>
<pre><code class="language-python"># Native code blocks with syntax styling
def send_telegram_rich_post():
    print("Post published natively via Bot API 10.1+!")</code></pre>

<h3>10. Geo Location & Footnotes</h3>
<div data-type="tg-map" data-lat="37.7749" data-lng="-122.4194" data-title="Telegram Tech Hub" data-address="San Francisco, California"></div>

<div data-type="tg-reference-block" data-ref-id="1" data-ref-label="[1]" data-ref-text="Telegram Bot API Rich Messages Documentation" data-ref-url="https://core.telegram.org/bots/api"></div>
`;

export const TELEGRAM_SHOWCASE_MEDIA: PostMedia[] = [
  {
    id: 'm_photo_showcase',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    isSpoiler: false,
  },
  {
    id: 'm_video_showcase',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    isSpoiler: true,
  },
  {
    id: 'm_audio_showcase',
    type: 'audio',
    url: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
  },
];

export const TELEGRAM_SHOWCASE_BUTTONS: PostInlineButton[][] = [
  [
    {
      id: 'btn_1',
      text: '🤖 Test in @deveremigream_bot',
      url: 'https://t.me/deveremigream_bot',
    },
    {
      id: 'btn_2',
      text: '📖 Bot API 10.1+ Docs',
      url: 'https://core.telegram.org/bots/api',
    },
  ],
];
