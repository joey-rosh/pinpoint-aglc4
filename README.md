# Pinpoint: AGLC4 Citation Engine

A browser-only generator for AGLC4 (4th ed) footnotes, ibid and subsequent references,
in-text mentions and bibliography entries, with a footnote sequencer and bibliography builder.

- No build step, no server and no dependencies. Open `index.html` or host the folder on GitHub Pages.
- Each visitor's library and footnotes are saved in their own browser (`localStorage`).
  Nothing is sent anywhere. Students can Export / Import their library as a `.json` file.
- Independent study aid, not affiliated with the Melbourne University Law Review Association.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page markup; loads the stylesheet and scripts in order |
| `styles.css` | All styling |
| `js/core.js` | Text formatting and citation logic (no DOM, so the tests can run it) |
| `js/sources.js` | The 75 source-type definitions: fields, example data and `cite()` formatter |
| `js/state.js` | Saved state: schema version, migration, validation, export/import |
| `js/app.js` | The interface: forms, output cards, sequencer, bibliography, primer |
| `tests/run.js` | Test suite (checks output against AGLC4 example citations) |

Scripts are plain `<script>` files that share globals, so their order in `index.html` matters:
`core.js` → `sources.js` → `state.js` → `app.js`.

## Running the tests

Requires Node.js 18+:

```bash
node tests/run.js
```

The same tests run automatically on GitHub on every push (`.github/workflows/tests.yml`).

## Adding or fixing a source type

1. Edit or add an entry in `js/sources.js`. The comment at the top explains each property.
2. Add a test case to the `CITES` list in `tests/run.js`, ideally using an example from the Guide.
3. Run `node tests/run.js`.

## Changing the saved-data format

Bump `SCHEMA` in `js/state.js` and add an upgrade step to `migrate()`, so students' saved libraries carry over.
