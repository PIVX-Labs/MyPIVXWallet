#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# If you do not have the credentials, ask @Duddino for them, or clone from github
GIT_LFS_SKIP_SMUDGE=1 git clone "https://$LFS_USERNAME:$LFS_PASSWORD@mpw-git.duddino.com/Duddino/MPW-playbacks.git" "$SCRIPT_DIR/e2e"
cd "$SCRIPT_DIR/e2e"
git lfs install
git checkout $(cat "$SCRIPT_DIR/commit_hash")
git lfs pull
