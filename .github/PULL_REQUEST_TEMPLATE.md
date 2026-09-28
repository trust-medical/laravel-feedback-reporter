## Summary

<!-- What does this change and why? Link the related issue, e.g. "Closes #123". -->

## Checklist

- [ ] PHP tests pass (`vendor/bin/pest`).
- [ ] Frontend tests pass (`npm test`).
- [ ] PHPStan passes without errors (`vendor/bin/phpstan analyse`).
- [ ] TypeScript passes without errors (`npm run typecheck`).
- [ ] Pint style checks pass (`vendor/bin/pint --test`).
- [ ] Biome passes (`npm run lint`).
- [ ] The headless, Alpine, and Widget bundles build cleanly and the rebuilt `dist/` is committed (`npm run build`).
- [ ] Dependency audits pass (`composer audit` and `npm run audit`).
- [ ] `CHANGELOG.md` and the READMEs are updated when behavior changes.
