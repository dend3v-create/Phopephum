import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
const { build } = createRequire(webRequire.resolve("vite"))("esbuild");
const fixture = {
  rows: [{ id: "customer-1", user_id: "owner", name: "Test subject", birth_date: "1996-07-25", birth_time: "17:30", birth_place: "เชียงใหม่" }],
  profile: { id: "owner", display_name: "Owner", birth_date: "1982-07-23", birth_time: "09:01", birth_place: "กรุงเทพมหานคร" },
  inputs: [], fail: false,
};
globalThis.__subjectUpdateFixture = fixture;
const mocks = {
  "~/services/auth.server": `const f=globalThis.__subjectUpdateFixture; export const requireAuth=async()=>({id:'owner'}); export const getProfile=async()=>f.profile; export const requireMinPlan=async()=>({user:{id:'owner'},profile:f.profile}); export const canAccess=()=>true;`,
  "~/services/permissions.server": `export const getPersonLimit=()=>null;`,
  "~/services/analytics.server": `export const logEvent=async()=>{}; export const EVENTS={CALC_HORA:'test'};`,
  "~/services/supabase.server": `
    const f=globalThis.__subjectUpdateFixture;
    export function createSupabaseClient(){return {supabase:{from(table){
      let operation='read',values,filters={};
      const result=()=>{
        if(f.fail && operation!=='read')return {data:null,error:{message:'test failure'}};
        if(table!=='customers')return {data:[],error:null};
        if(operation==='insert') {const row={id:'customer-new',...values};f.rows.push(row);return {data:{id:row.id},error:null};}
        const rows=f.rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v));
        if(operation==='update'){rows.forEach(r=>Object.assign(r,values));return {data:rows[0]?{id:rows[0].id}:null,error:null};}
        return {data:rows,error:null};
      };
      const q={select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return q},insert(v){operation='insert';values=v;return q},update(v){operation='update';values=v;return q},single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};
      return q;
    }}}}
  `,
  "@phopephum/engine": `
    const f=globalThis.__subjectUpdateFixture;
    module.exports={DAY_NAMES_THAI:[],STAR_NAMES:{},getYamPrediction:()=>({}),calculateLagnaNakshatra:()=>({}),calculatePhopephum:async(input)=>{f.inputs.push(input);return {nineBase:{bases:[]},crossCheck:{elementPairFlags:[],alerts:[]}}}};
  `,
};
async function loadModule(entry) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
    alias: { "~": path.join(root, "apps/web/app") },
    external: ["react", "react-dom", "react/jsx-runtime", "@remix-run/react", "@remix-run/cloudflare", "lucide-react"],
    plugins: [{ name: "isolated-server-fixtures", setup(b) {
      b.onResolve({ filter: /.*/ }, a => Object.hasOwn(mocks, a.path) ? { path: a.path, namespace: "fixture" } : undefined);
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ contents: mocks[a.path], loader: "js" }));
    }}], logLevel: "silent",
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(webRequire, mod, mod.exports);
  return mod.exports;
}
const people = await loadModule("apps/web/app/routes/dashboard.people.tsx");
const horoscope = await loadModule("apps/web/app/routes/dashboard.horoscope.tsx");
const { resolveRevalidatedCalculation } = await loadModule("apps/web/app/utils/revalidatedCalculation.ts");
const context = { cloudflare: { env: {} } };
async function save(fields) {
  const body = new URLSearchParams({ _action: "update", id: "customer-1", name: "Test subject", birthDay: "25", birthMonth: "7", birthYear: "2539", birthTime: "17:30", birthPlace: "ภูเก็ต", ...fields });
  return people.action({ request: new Request("https://test.invalid/dashboard/people", { method: "POST", body }), context });
}
async function chart(id) {
  const response = await horoscope.loader({ request: new Request(`https://test.invalid/dashboard/horoscope?customerId=${id}`), context });
  return response.json();
}
assert.equal((await chart("customer-1")).initialResult.birthPlace, "เชียงใหม่", "customer location must not fall back to account location");
assert.equal((await save({})).status, 200);
const updated = await chart("customer-1");
assert.equal(updated.activeSubject.birthPlace, "ภูเก็ต");
assert.equal(updated.initialResult.birthPlace, "ภูเก็ต");
assert.equal(fixture.inputs.at(-1).birthPlace, "ภูเก็ต", "latest place reaches the calculation boundary");
const stale = { birthPlace: "เชียงใหม่" };
assert.equal(resolveRevalidatedCalculation(updated.initialResult, stale, false).birthPlace, "ภูเก็ต", "old action must not override a saved edit");
assert.equal(resolveRevalidatedCalculation(updated.initialResult, stale, true), stale, "new manual calculation retains precedence");
const createdResponse = await save({ _action: "create", activateSubject: "true", birthPlace: "สงขลา" });
const created = await createdResponse.json();
assert.equal(created.customerId, "customer-new");
assert.match(createdResponse.headers.get("Set-Cookie"), /phopephum_active_subject=customer-new/);
assert.equal((await chart(created.customerId)).initialResult.birthPlace, "สงขลา");
fixture.rows.push({ ...fixture.rows[0], id: "other-customer", user_id: "another-owner" });
assert.equal((await save({ id: "other-customer" })).status, 404, "cross-owner update must not report success");
assert.equal((await save({ id: "missing" })).status, 404);
fixture.fail = true;
assert.equal((await save({})).status, 500);
assert.equal((await save({ _action: "create" })).status, 500);
assert.equal(fixture.rows[0].birth_place, "ภูเก็ต", "failed save preserves previously saved location");
delete globalThis.__subjectUpdateFixture;
console.log("PASS: active-subject create/edit, birthplace loader/calculation handoff, stale-result precedence, ownership and save failures (isolated DB/engine fixtures)");
