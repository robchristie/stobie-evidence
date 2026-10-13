# Stobie evidence archive

Raw verification and qualification evidence for
[Stobie](https://github.com/robchristie/stobie): screenshots, logs, runtime
snapshots and JSON observations. Stobie keeps the conclusions in its
Markdown reports and links here at fixed commits; its
[evidence archive guide](https://github.com/robchristie/stobie/blob/main/docs/evidence-archive.md)
explains the policy.

The first archive holds 652 files removed from Stobie's working tree on
2026-10-13. Each is a byte-for-byte copy, at its original path, from Stobie
commit `03ad5c5c3a125e453ec96554a078dda9d6ad4f64`. Check them with:

```sh
sha256sum --check --quiet evidence-archive.sha256
```

Stobie tracks the same manifest as `docs/evidence-archive.sha256`.

## Original Stobie history

After this archive was made, Stobie's history was rewritten to remove the same
files from every commit. That gave every commit on Stobie's rewritten branches
except the root a new ID and removed GitHub's signatures from them. The
[`archive-2026-10-13` release](https://github.com/robchristie/stobie-evidence/releases/tag/archive-2026-10-13)
holds a complete Git bundle of the original history and a map from original
to rewritten commit IDs. Stobie's
[evidence archive guide](https://github.com/robchristie/stobie/blob/main/docs/evidence-archive.md#history)
describes the rewrite.

## Rules

This repository is append-only. Add later archives in new commits and never
rewrite its history, because Stobie's permalinks depend on it. Rulesets block
force-pushing or deleting `main` and moving or deleting `archive-*` tags.

Licensed under the same terms as Stobie, the [Apache License 2.0](LICENSE).
