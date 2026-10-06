# Repository maintenance

- Keep active website code in the main project path free of retired or unused implementations.
- Before replacing or removing reusable source, move the retired version into `.cache/retired/<date>-<description>/`.
- Treat `.cache/` as local archival storage only. Do not reference it from the live site or include it in deployment commits.
- Do not duplicate the active implementation in the cache.
