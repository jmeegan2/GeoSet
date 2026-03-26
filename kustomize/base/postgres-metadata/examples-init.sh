#!/usr/bin/env bash
# Required: Superset needs a separate "examples" database and user in the metadata
# Postgres for `superset load_examples` to work. This is the k8s equivalent of
# docker/docker-entrypoint-initdb.d/examples-init.sh in the Superset repo.
set -e
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-EOSQL
  CREATE USER ${EXAMPLES_USER} WITH PASSWORD '${EXAMPLES_PASSWORD}';
  CREATE DATABASE ${EXAMPLES_DB};
  GRANT ALL PRIVILEGES ON DATABASE ${EXAMPLES_DB} TO ${EXAMPLES_USER};
EOSQL
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" -d "${EXAMPLES_DB}" <<-EOSQL
  GRANT ALL ON SCHEMA public TO ${EXAMPLES_USER};
EOSQL
