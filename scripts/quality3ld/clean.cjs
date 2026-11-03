const { loadState, request, collectionPath, config, saveState } = require("./common.cjs");
async function main() {
  const state = loadState();
  if (state.project !== config().project || state.database !== config().database)
    throw new Error("Environment differs from resource manifest");
  const resources = [...state.resources].reverse().filter((r) => !r.deleted);
  if (!process.argv.includes("--execute")) {
    console.log("Dry run; only registered test resources would be deleted:");
    console.table(resources.map(({ kind, id }) => ({ kind, id })));
    return;
  }
  for (const resource of resources) {
    if (!resource.id.startsWith("ld3_")) throw new Error("Refusing unprefixed resource");
    const paths = {
      user: `/users/${resource.id}`,
      collection: collectionPath(resource.id),
      bucket: `/storage/buckets/${resource.id}`,
      file: `/storage/buckets/${resource.bucket}/files/${resource.id}`,
    };
    if (!paths[resource.kind]) throw new Error("Unrecognized resource kind");
    const r = await request(paths[resource.kind], { method: "DELETE", admin: true });
    if (![200, 204, 404].includes(r.status))
      throw new Error(`Cleanup ${resource.kind}: ${r.status}`);
    state.resources.find(
      (x) => x.kind === resource.kind && x.id === resource.id,
    ).deleted = true;
    saveState(state);
  }
  state.cleaned = true;
  saveState(state);
  console.log(
    "Registered 3LD resources removed. Production resources were not targeted.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
