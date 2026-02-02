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

# Ensure this script is run as root
if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root" >&2
  exit 1
fi

# Check for required arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <package1> [<package2> ...]" >&2
  exit 1
fi

# Colors for better logging (optional)
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

# Detect package manager (microdnf for ubi-minimal, dnf for full UBI)
if command -v microdnf &> /dev/null; then
  PKG_MANAGER="microdnf"
elif command -v dnf &> /dev/null; then
  PKG_MANAGER="dnf"
else
  echo "No supported package manager found (microdnf or dnf)"
  exit 1
fi

# Update and install packages with clean-up
# Note: update + install in same command follows Docker best practices (AVD-DS-0017)
echo -e "${GREEN}Updating packages (using ${PKG_MANAGER})${RESET}"
$PKG_MANAGER update -y

echo -e "${GREEN}Installing packages: $@ (using ${PKG_MANAGER})${RESET}"
$PKG_MANAGER install -y "$@"

echo -e "${GREEN}Cleaning up package cache...${RESET}"
$PKG_MANAGER clean all
rm -rf /var/cache/yum/* /var/cache/dnf/* /tmp/* /var/tmp/*

echo -e "${GREEN}Installation and cleanup complete.${RESET}"
