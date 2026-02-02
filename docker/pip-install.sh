#!/usr/bin/env bash
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
set -euo pipefail

# Default flag
REQUIRES_BUILD_ESSENTIAL=false
USE_CACHE=true

# Filter arguments
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --requires-build-essential)
      REQUIRES_BUILD_ESSENTIAL=true
      ;;
    --no-cache)
      USE_CACHE=false
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

# Detect package manager (microdnf for ubi-minimal, dnf for full RHEL/UBI, apt for Debian)
if command -v microdnf &> /dev/null; then
  PKG_MANAGER="microdnf"
elif command -v dnf &> /dev/null; then
  PKG_MANAGER="dnf"
elif command -v apt-get &> /dev/null; then
  PKG_MANAGER="apt"
else
  echo "No supported package manager found (microdnf, dnf or apt-get)"
  exit 1
fi

# Install build-essential if required
if $REQUIRES_BUILD_ESSENTIAL; then
  echo "Installing build tools for package builds..."
  if [[ "$PKG_MANAGER" == "microdnf" ]]; then
    microdnf install -y gcc gcc-c++ make
  elif [[ "$PKG_MANAGER" == "dnf" ]]; then
    dnf install -y --nodocs gcc gcc-c++ make
  else
    apt-get update -qq \
      && apt-get install -yqq --no-install-recommends build-essential
  fi
fi

# Choose whether to use pip cache
if $USE_CACHE; then
  echo "Using pip cache..."
  uv pip install "${ARGS[@]}"
else
  echo "Disabling pip cache..."
  uv pip install --no-cache-dir "${ARGS[@]}"
fi

# Remove build tools if they were installed
if $REQUIRES_BUILD_ESSENTIAL; then
  echo "Removing build tools to keep the image lean..."
  if [[ "$PKG_MANAGER" == "microdnf" ]]; then
    microdnf remove -y gcc gcc-c++ make \
      && microdnf clean all \
      && rm -rf /var/cache/yum/*
  elif [[ "$PKG_MANAGER" == "dnf" ]]; then
    dnf remove -y gcc gcc-c++ make \
      && dnf clean all \
      && rm -rf /var/cache/dnf/*
  else
    apt-get autoremove -yqq --purge build-essential \
      && apt-get clean \
      && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
  fi
fi

echo "Python packages installed successfully."
