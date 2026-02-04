# Boss Night Team Builder (Standalone)

A **standalone, user-friendly web app** for building Tibia boss night teams. No Discord bot required.

- **Import** sign-ups in the same format as the Discord bot (`@Name (Vocation) BossCodes`)
- **Add roles** (e.g. Red Knight, Mentor) and **vocation priority** per boss
- **Generate teams** using the same boss rules (Pale, Zelos, Ferumbras, HoD, LLK, Cults, First Dragon)
- **Drag-and-drop preview** to adjust teams before copying
- **Copy-paste** formatted text into your own Discord channels

## How to use

1. Open `index.html` in a browser (double-click or drag into Chrome/Edge/Firefox).
2. **Step 1 – Import:** Paste your sign-up list, then click **Import**. Edit players, add roles and priority if needed.
3. **Step 2 – Generate:** Enter boss codes and team counts (e.g. `P2 Z1 F1` = 2 Pale teams, 1 Zelos, 1 Ferumbras). Click **Generate teams**.
4. **Step 3 – Preview:** Review and drag players between teams or slots. Click **Copy formatted text** to get Discord-ready text.
5. Paste into your Discord channel or thread.

## Boss codes

| Code | Boss            | Size |
|------|-----------------|------|
| P    | Pale            | 10   |
| D    | The First Dragon| 15   |
| Z    | Zelos           | 10   |
| F    | Ferumbras       | 15   |
| H    | Heart of Destruction | 15 |
| L    | Last Lore Keeper| 15   |
| C    | Cults           | 10   |

## Hosting

- Use locally by opening `index.html`.
- Or host the `standalone-bossnight` folder on any static host (GitHub Pages, Netlify, etc.); no server needed.
