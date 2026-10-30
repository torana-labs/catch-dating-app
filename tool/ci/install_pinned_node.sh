#!/usr/bin/env bash
# Installs the Node.js major that tool/ci/toolchain.env pins (NODE_VERSION) for
# the current user, when the node on PATH is a different major. Cloud agent
# images ship their own Node (Claude Code cloud sessions have Node 22), while CI
# and the Functions runtime use the pinned major; call this from the cloud
# environment's setup script so every session starts on the same Node as CI.

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: bash tool/ci/install_pinned_node.sh

Installs the latest release of the Node.js major pinned by
tool/ci/toolchain.env (NODE_VERSION) when the node on PATH differs, verifies
its SHA-256 against nodejs.org's SHASUMS256.txt, and links node, npm, npx and
corepack into ~/.local/bin. Does nothing when the pinned major is already
active. Supports Linux and macOS on x64 and arm64.

Environment overrides:
  CATCH_NODE_HOME      install root (default: ~/.local/share/catch-node)
  CATCH_NODE_BIN_DIR   link directory, which must precede other Node
                       installs on PATH (default: ~/.local/bin)
  CATCH_NODE_DIST_URL  distribution root (default: https://nodejs.org/dist)
USAGE
}

if [[ $# -gt 0 ]]; then
  if [[ $1 == "--help" || $1 == "help" ]]; then
    usage
    exit 0
  fi
  usage >&2
  exit 64
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$script_dir/toolchain.env"
if ! [[ ${NODE_VERSION:-} =~ ^[1-9][0-9]*$ ]]; then
  echo "tool/ci/toolchain.env NODE_VERSION must be a Node.js major, not '${NODE_VERSION:-}'." >&2
  exit 1
fi

node_major() {
  local version
  version="$("$1" --version 2>/dev/null)" || return 1
  version="${version#v}"
  printf '%s\n' "${version%%.*}"
}

current_node="$(command -v node || true)"
if [[ -n $current_node ]] && [[ "$(node_major "$current_node" || true)" == "$NODE_VERSION" ]]; then
  echo "Node $("$current_node" --version) at $current_node already matches NODE_VERSION=$NODE_VERSION."
  exit 0
fi

case "$(uname -s)" in
  Linux) platform=linux ;;
  Darwin) platform=darwin ;;
  *) echo "Unsupported OS $(uname -s); install Node.js $NODE_VERSION by hand." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "Unsupported CPU $(uname -m); install Node.js $NODE_VERSION by hand." >&2; exit 1 ;;
esac

dist_url="${CATCH_NODE_DIST_URL:-https://nodejs.org/dist}/latest-v$NODE_VERSION.x"
install_root="${CATCH_NODE_HOME:-$HOME/.local/share/catch-node}"
bin_dir="${CATCH_NODE_BIN_DIR:-$HOME/.local/bin}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

curl -fsSL --retry 3 -o "$work_dir/SHASUMS256.txt" "$dist_url/SHASUMS256.txt"
archive_pattern="^[0-9a-f]{64}  node-v$NODE_VERSION\\.[0-9]+\\.[0-9]+-$platform-$arch\\.tar\\.xz$"
checksum_line="$(grep -E "$archive_pattern" "$work_dir/SHASUMS256.txt" || true)"
if [[ $(grep -c . <<<"$checksum_line") -ne 1 ]]; then
  echo "SHASUMS256.txt at $dist_url has no single Node $NODE_VERSION $platform-$arch archive." >&2
  exit 1
fi
archive="${checksum_line##* }"
release="${archive%.tar.xz}"

if [[ ! -x "$install_root/$release/bin/node" ]]; then
  curl -fsSL --retry 3 -o "$work_dir/$archive" "$dist_url/$archive"
  if command -v sha256sum >/dev/null; then
    (cd "$work_dir" && sha256sum -c --status <<<"$checksum_line")
  else
    (cd "$work_dir" && shasum -a 256 -c --status <<<"$checksum_line")
  fi || {
    echo "Checksum mismatch for $archive from $dist_url; nothing was installed." >&2
    exit 1
  }
  mkdir -p "$install_root"
  tar -xJf "$work_dir/$archive" -C "$work_dir"
  rm -rf "${install_root:?}/$release"
  mv "$work_dir/$release" "$install_root/$release"
fi

mkdir -p "$bin_dir"
for tool in node npm npx corepack; do
  if [[ -e "$install_root/$release/bin/$tool" ]]; then
    ln -sfn "$install_root/$release/bin/$tool" "$bin_dir/$tool"
  fi
done

hash -r
active_node="$(command -v node || true)"
if [[ $active_node != "$bin_dir/node" ]]; then
  echo "Installed $release, but node on PATH is ${active_node:-missing}." >&2
  echo "Put $bin_dir before other Node installs on PATH." >&2
  exit 1
fi
echo "Node $("$active_node" --version) is active at $active_node (NODE_VERSION=$NODE_VERSION)."
