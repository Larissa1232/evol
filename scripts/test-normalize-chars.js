// Quick test script to verify CartSummary normalization logic
const sample = [{"roleid":8202,"rolename":"Lari1"},{"roleid":12298,"rolename":"Lari2"},{"roleid":16394,"rolename":"Lari3"}];

function normalizeArray(rawList){
  if (!Array.isArray(rawList)) return [];
  return rawList.map(v => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    if (v.rolename) return v.rolename;
    if (v.role_name) return v.role_name;
    if (v.roleName) return v.roleName;
    if (v.name) return v.name;
    if (v.displayName) return v.displayName;
    const nested = Object.values(v).find(x => typeof x === 'string');
    return nested || JSON.stringify(v);
  });
}

const result = normalizeArray(sample);
console.log('Normalized:', result);

// Print each on separate line for clarity
result.forEach(r => console.log('-', r));

process.exit(0);
