#!/usr/bin/env bash
# Installs the veraPDF command-line validator from Maven Central (needs Java 11+
# and Maven) and prints the path of a launcher script. Used by CI so the
# PDF/A tests validate archive output; locally: export VERAPDF=$(scripts/install-verapdf.sh)
set -euo pipefail
VERSION="${VERAPDF_VERSION:-1.28.2}"
DEST="${1:-${HOME}/.cache/verapdf-${VERSION}}"
mkdir -p "${DEST}"
if [ ! -f "${DEST}/verapdf" ]; then
  cat > "${DEST}/pom.xml" <<POM
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion>
  <groupId>local</groupId><artifactId>verapdf-cli</artifactId><version>1</version>
  <dependencies><dependency>
    <groupId>org.verapdf.apps</groupId><artifactId>greenfield-apps</artifactId><version>${VERSION}</version>
  </dependency></dependencies>
</project>
POM
  mvn -q -f "${DEST}/pom.xml" dependency:copy-dependencies -DoutputDirectory="${DEST}/lib" -DincludeScope=runtime >&2
  mvn -q -f "${DEST}/pom.xml" dependency:copy -Dartifact="org.verapdf.apps:greenfield-apps:${VERSION}" -DoutputDirectory="${DEST}/lib" >&2
  printf '#!/bin/sh\nexec java -cp "%s/lib/*" org.verapdf.apps.GreenfieldCliWrapper "$@"\n' "${DEST}" > "${DEST}/verapdf"
  chmod +x "${DEST}/verapdf"
fi
echo "${DEST}/verapdf"
