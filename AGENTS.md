# Project rules

- This is a browser-based, turn-based strategy game for nontechnical playtesters.
- The world uses pointy-top hexes for movement and combat. Hex borders remain visible, while terrain art must blend naturally across cells.
- Combat occurs directly on the world map. Regular attacks use short map animations; only exceptional hero skills may use a separate cinematic overlay.
- All procedural generation must be reproducible from a seed.
- Keep game rules independent from rendering so they can be tested without a browser.
- Prioritize a working, reviewable prototype over speculative features.
- Do not add monetization, accounts, cloud saves, social features, or tactical battle scenes until the core loop is validated.
- After each change, report what the playtester should inspect in plain Korean.
