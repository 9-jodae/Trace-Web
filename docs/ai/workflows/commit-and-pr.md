# Commit and open a PR

1. Inspect the current directory, branch, working tree, and fetched remote changes. Confirm `develop` as the PR target; preserve unrelated changes.
2. Review the diff for secrets and scope. Run `docs/ai/workflows/verify.md`.
3. Make focused commits using `type(scope): Korean description`; allowed types are in `AGENTS.md`. Never push to `main` or `develop` directly.
4. Open a PR to `develop`. Fill `.github/pull_request_template.md` in Korean with reasons, changes, actual verification, related issues, and any preceding PR dependency.
5. For stacked PRs, if a preceding branch changes, run `git merge origin/<preceding-branch>` on each later branch. If it diverges after an earlier PR merges, run `git merge origin/develop`. Stop if a conflict requires judgment. Verify, then use a normal push.
6. Merge only when the user asks. Before merging, check passing CI, no human `CHANGES_REQUESTED` review, `mergeable` without conflicts, and base `develop`. Merge in order with `gh pr merge {n} --merge`; never use `--admin`, squash, rebase merge, or delete the remote branch. Recheck later PRs after each merge.
7. Report CI outcomes and merge SHAs in Korean.
