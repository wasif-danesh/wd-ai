#!/usr/bin/env bash
# Checksum-verified installers for tools that are not in every package manager (or are too old
# there): Node 22, kind, kubectl, helm. Installs into $LOCAL_BIN without sudo. Works on macOS and
# Linux (amd64/arm64). Sourced by setup.sh; can also be run directly: install-tools.sh <tool>...
# Override PLATFORM/GOARCH/NODEARCH/LOCAL_BIN to test another target.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

KIND_VERSION="${KIND_VERSION:-v0.33.0}"
HELM_VERSION="${HELM_VERSION:-v4.3.0}"
NODE_MAJOR_WANTED=22

sha256_of() { if have sha256sum; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }

# fetch URL DEST EXPECTED_SHA256
fetch_verified() {
  curl -fsSL --retry 3 -o "$2" "$1"
  got="$(sha256_of "$2")"
  [ "$got" = "$3" ] || { bad "checksum mismatch for $1"; rm -f "$2"; return 1; }
}

first_field() { awk '{print $1}' | head -1; }

install_kind() {
  mkdir -p "$LOCAL_BIN"; f="kind-$PLATFORM-$GOARCH"
  base="https://github.com/kubernetes-sigs/kind/releases/download/$KIND_VERSION"
  sum="$(curl -fsSL "$base/$f.sha256sum" | first_field)"
  fetch_verified "$base/$f" "$LOCAL_BIN/kind" "$sum" && chmod +x "$LOCAL_BIN/kind" && ok "kind $KIND_VERSION installed in $LOCAL_BIN"
}

install_kubectl() {
  mkdir -p "$LOCAL_BIN"
  ver="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  base="https://dl.k8s.io/release/$ver/bin/$PLATFORM/$GOARCH"
  sum="$(curl -fsSL "$base/kubectl.sha256" | first_field)"
  fetch_verified "$base/kubectl" "$LOCAL_BIN/kubectl" "$sum" && chmod +x "$LOCAL_BIN/kubectl" && ok "kubectl $ver installed in $LOCAL_BIN"
}

install_helm() {
  mkdir -p "$LOCAL_BIN"; tmp="$(mktemp -d)"; f="helm-$HELM_VERSION-$PLATFORM-$GOARCH.tar.gz"
  sum="$(curl -fsSL "https://get.helm.sh/$f.sha256sum" | first_field)"
  fetch_verified "https://get.helm.sh/$f" "$tmp/$f" "$sum" \
    && tar -xzf "$tmp/$f" -C "$tmp" "$PLATFORM-$GOARCH/helm" \
    && mv "$tmp/$PLATFORM-$GOARCH/helm" "$LOCAL_BIN/helm" && chmod +x "$LOCAL_BIN/helm" \
    && ok "helm $HELM_VERSION installed in $LOCAL_BIN"
  rm -rf "$tmp"
}

# Node 22 from nodejs.org (distro packages are often too old), then pnpm via corepack.
install_node() {
  mkdir -p "$LOCAL_BIN"; tmp="$(mktemp -d)"
  idx="https://nodejs.org/dist/latest-v$NODE_MAJOR_WANTED.x"
  line="$(curl -fsSL "$idx/SHASUMS256.txt" | grep -E "node-v[0-9.]+-$PLATFORM-$NODEARCH\.tar\.gz\$" | head -1)"
  sum="$(printf '%s' "$line" | awk '{print $1}')"; f="$(printf '%s' "$line" | awk '{print $2}')"
  [ -n "$f" ] || { bad "no Node $NODE_MAJOR_WANTED build for $PLATFORM-$NODEARCH"; return 1; }
  fetch_verified "$idx/$f" "$tmp/$f" "$sum"
  dest="$HOME/.local/${f%.tar.gz}"; rm -rf "$dest"; mkdir -p "$HOME/.local"
  tar -xzf "$tmp/$f" -C "$HOME/.local"
  for b in node npm npx corepack; do ln -sf "$dest/bin/$b" "$LOCAL_BIN/$b"; done
  rm -rf "$tmp"; ok "node ${f#node-}" 
}

# pnpm through corepack (version pinned by the packageManager field in package.json).
install_pnpm() {
  mkdir -p "$LOCAL_BIN"
  have corepack || { bad "corepack not found; install Node 22 first"; return 1; }
  corepack enable --install-directory "$LOCAL_BIN"
  ok "pnpm enabled through corepack in $LOCAL_BIN"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  for t in "$@"; do "install_$t"; done
fi
