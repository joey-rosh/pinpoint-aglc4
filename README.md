# Pinpoint: AGLC4 Citation Engine

**Pinpoint is a free, browser-based tool for writing legal citations in AGLC4 style.**
Fill in the details of a source and it gives you the citation in every form you need:
the first footnote, ibid, later cross-references, how to name the source in your essay,
and the bibliography entry.

**➜ [Open Pinpoint](https://joey-rosh.github.io/pinpoint-aglc4/)**

It follows the *Australian Guide to Legal Citation* (4th edition). Pinpoint is an independent
study aid. It is not affiliated with the Melbourne University Law Review Association or the
Melbourne Journal of International Law.

---

## What it does

- **75 source types** across the whole Guide:
  - cases, tribunal decisions, transcripts and submissions
  - Acts, Bills, delegated legislation, explanatory memoranda and gazettes
  - journal articles, books and book chapters
  - reports, Hansard, parliamentary submissions and speeches
  - dictionaries, encyclopedias and looseleaf services
  - newspapers, websites, social media, film, television and podcasts
  - treaties, UN documents, the ICJ, arbitrations, WTO reports and European courts
  - UK, US, New Zealand and Canadian sources
- **Every form of each citation:**
  - the first footnote, with pinpoint, introductory signal and short title
  - ibid
  - the later cross-reference, eg *Smith (n 4) 12*
  - the “at” form for citing a source again in the same footnote
  - how to refer to the source in the body of your essay
  - the bibliography entry, filed under the right section
- **Rule checks.** Pinpoint fixes common mistakes as you type, such as “& Ors”, full stops in
  abbreviations and initials, “(No 2)” instead of “[No 2]”, title capitalisation and date formats.
  It also flags anything still missing.
- **Footnote Sequencer.** Add your footnotes in the order they appear in your essay. Pinpoint
  decides which ones should be a full citation, which should be “Ibid”, and which should be a
  cross-reference.
- **Bibliography builder.** Your saved sources are grouped into AGLC sections and put in
  alphabetical order automatically.
- **Rule Primer.** A quick reference for signals, subsequent references, pinpoint abbreviations,
  judicial titles and formatting basics.

## How to use it

1. **Choose a source type** from the list on the left, or search for one, eg “podcast” or “treaty”.
2. **Fill in the fields.** Required fields are marked with *. Not sure what goes where? Select
   **Load example** to see the source type filled in with made-up sample data.
3. **Copy what you need.** Each **Copy** button keeps italics and superscripts when you paste
   into Word or Google Docs.
4. **Save to library** to reuse the source in the Footnote Sequencer and Bibliography tabs.

Pinpoint handles the formatting, but it can only work with what you type in. Always check the
finished citation against the Guide and your unit's own requirements.

## Your data stays on your device

Pinpoint runs entirely in your browser. Nothing you type is sent anywhere, and there are no
accounts or tracking.

Your library and footnotes are saved in the browser you are using. This means:

- they won't appear on another computer or browser automatically;
- clearing your browser data, or using a private window, will remove them.

To keep a copy or move your library to another device, open the **Bibliography** tab and select
**Export**. Select **Import** on the other device to load it back.

## Found a mistake?

If a citation doesn't match the Guide, please
[open an issue](../../issues) with:

- the source type you used;
- what you entered;
- what Pinpoint produced;
- what you expected, with the AGLC4 rule number if you know it.

---

## For contributors

Pinpoint is plain HTML, CSS and JavaScript. It has no build step and no dependencies.

| File | Contents |
| --- | --- |
| `index.html` | Page markup; loads the stylesheet and scripts |
| `styles.css` | Styling |
| `js/core.js` | Text formatting and citation logic |
| `js/sources.js` | The source-type definitions: fields, example data and formatting rules |
| `js/state.js` | Saved data, versioning and export/import |
| `js/app.js` | The user interface |
| `tests/run.js` | Tests that check output against example citations from AGLC4 |

The scripts share global variables, so they must load in this order:
`core.js` → `sources.js` → `state.js` → `app.js`.

**Running the tests** (requires Node.js 18 or later):

```bash
node tests/run.js
```

The tests also run automatically on every push and pull request.

**Adding or correcting a source type:**

1. Edit or add its entry in `js/sources.js`. The comment at the top of the file explains each property.
2. Add a test case to the `CITES` list in `tests/run.js`, ideally using an example from the Guide.
3. Run the tests.

**Changing the saved-data format:** increase `SCHEMA` in `js/state.js` and add an upgrade step to
`migrate()`. That way people's existing libraries carry over to the new version.
