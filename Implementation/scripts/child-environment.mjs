// Child processes receive only OS/runtime coordinates, never inherited application configuration.
const runtimeNames = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "WINDIR",
  "SYSTEMDRIVE",
  "COMSPEC",
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "COMMONPROGRAMFILES",
  "JAVA_HOME",
  "JDK_HOME",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
]);
const injectedOptions = new Set([
  "JAVA_TOOL_OPTIONS",
  "JDK_JAVA_OPTIONS",
  "_JAVA_OPTIONS",
  "JAVA_OPTIONS",
  "JAVA_OPTS",
  "IBM_JAVA_OPTIONS",
  "OPENJ9_JAVA_OPTIONS",
  "NODE_OPTIONS",
]);

/** Reject configuration injection before resources exist; never include host names/values in diagnostics. */
export function createChildEnvironment(host) {
  for (const name of Object.keys(host)) {
    const canonical = name.toUpperCase();
    if (canonical.startsWith("SPRING_") || injectedOptions.has(canonical)) {
      throw new Error(
        "Inherited application/runtime configuration is not allowed",
      );
    }
  }
  const clean = {};
  for (const [name, value] of Object.entries(host)) {
    // Preserve one spelling per variable on Windows, where environment keys are case-insensitive.
    const canonical = name.toUpperCase();
    if (runtimeNames.has(canonical) && typeof value === "string")
      clean[canonical] = value;
  }
  return Object.freeze(clean);
}
