// node tools/people3.mjs : writes tools/people3.json, the cast of both driving games (see tools/bake3.js)
import fs from 'fs';
const OUT = 'Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/', BASE = 'Universal Base Characters[Standard]/Base Characters/Godot - UE/', HAIR = 'Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/';
const K = (k, q) => Math.round(k * q * 1000) / 1000;
function outfit(name, q) {
  const m = {
    Male_Peasant: { Male_Peasant_Arms_1: { mask: 1, keep: 0.3 }, Male_Peasant_Arms_2: { mask: 2, keep: 0.2 }, Male_Peasant_Body: { mask: 1, keep: 0.25 }, Male_Peasant_Feet: { keep: 0.22 }, Male_Peasant_Legs: { keep: 0.3 } },
    Female_Peasant: { Female_Peasant_Arms: { keep: 0.2 }, Female_Peasant_Body: { mask: 1, keep: 0.25 }, Female_Peasant_Feet: { keep: 0.22 }, Female_Peasant_Legs: { keep: 0.3 } },
    Male_Ranger: { Male_Ranger_Body: { mask: 1, keep: 0.22 }, Male_Ranger_Head_Hood: { skip: true }, Male_Ranger_Arms_1: { mask: 1, keep: 0.25 }, Male_Ranger_Arms_2: { mask: 2, keep: 0.18 }, Male_Ranger_Arms_Bracer: { keep: 0.1 }, Male_Ranger_Feet_Boots: { keep: 0.14 }, Male_Ranger_Acc_Pauldron: { skip: true }, Male_Ranger_Body_Belt_1: { keep: 0.2 }, Male_Ranger_Body_Belt_2: { keep: 0.2 }, Male_Ranger_Legs: { keep: 0.3 } },
    Female_Ranger: { Female_Ranger_Body: { mask: 1, keep: 0.22 }, Female_Ranger_Head_Hood: { skip: true }, Female_Ranger_Arms: { mask: 1, keep: 0.25 }, Female_Ranger_Arms_Bracer: { keep: 0.1 }, Female_Ranger_Feet_Boots: { keep: 0.14 }, Female_Ranger_Acc_Pauldron: { skip: true }, Female_Ranger_Body_Belt: { keep: 0.2 }, Female_Ranger_Legs: { keep: 0.3 } },
  }[name];
  for (const k in m) if (m[k].keep) m[k].keep = K(m[k].keep, q);
  return { file: OUT + name + '.gltf', meshes: m, keep: K(0.2, q) };
}
const head = (fem, q) => ({ file: BASE + (fem ? 'Superhero_Female_FullBody.gltf' : 'Superhero_Male_FullBody.gltf'), headOnly: fem ? 1.4 : 1.45, meshes: { [fem ? 'Superhero_Female' : 'SuperHero_Male']: { mask: 2, keep: K(0.55, q) }, Eyes: { keep: K(0.7, q) }, Eyebrows: { skip: true } } });
const hair = (n, q) => ({ file: HAIR + n + '.gltf', meshes: { '*': { mask: 3, bright: 1.15, keep: K(0.35, q) } }, keep: K(0.35, q) });
const brows = (fem, q) => ({ file: HAIR + (fem ? 'Eyebrows_Female' : 'Eyebrows_Regular') + '.gltf', meshes: { '*': { mask: 4, bright: 1.1, keep: K(0.5, q) } }, keep: K(0.5, q) });
const C = (name, src, frames, loop, o = {}) => ({ name, src, frames, ...(loop ? { loop: true } : {}), ...o });
const PASS = [C('idle', 'Idle_Loop', 4, 1), C('wave', 'Idle_Rail_Call', 8, 1), C('walk', 'Walk_Loop', 8, 1, { inPlace: true }), C('sit', 'Sitting_Idle_Loop', 4, 1), C('sittalk', 'Sitting_Talking_Loop', 8, 1),
  C('phone', 'Idle_TalkingPhone_Loop', 6, 1), C('cheer', 'Dance_Loop', 8, 1), C('yes', 'Yes', 6), C('no', 'Idle_No_Loop', 6, 1), C('angry', 'Idle_FoldArms_Loop', 4, 1), C('hit', 'Hit_Knockback', 6), C('scared', 'Crouch_Idle_Loop', 4, 1)];
const RACER = [C('drive', 'Driving_Loop', 6, 1), C('cheer', 'Dance_Loop', 8, 1), C('idle', 'Idle_Loop', 4, 1), C('no', 'Idle_No_Loop', 6, 1), C('yes', 'Yes', 6), C('wave', 'Idle_Rail_Call', 6, 1), C('hit', 'Hit_Knockback', 5)];
const PED = [C('walk', 'Walk_Loop', 6, 1, { inPlace: true }), C('idle', 'Idle_Loop', 2, 1), C('wave', 'Idle_Rail_Call', 4, 1), C('cheer', 'Dance_Loop', 6, 1), C('hit', 'Hit_Knockback', 4), C('run', 'Sprint_Loop', 6, 1, { inPlace: true })];
const person = (id, fem, out, hairs, o = {}, q = 1, clips = PASS) => ({ id, scale: o.scale || (fem ? 0.97 : 1.0), bulk: o.bulk, keep: K(0.25, q), parts: [outfit(out, q), head(fem, q), ...hairs.map(h => hair(h, q)), brows(fem, q)], clips, acc: o.acc, hats: o.hats, weapon: o.weapon, mouthAt: o.mouthAt });
const phone = { box: [0.07, 0.13, 0.012], color: 0x1a1a24, out: 0.02 };
const spec = [
  // Mad Taxi Masti: passengers (seen close up in the back-seat camera)
  person('groom', 0, 'Male_Peasant', ['Hair_SimpleParted'], { acc: [{ type: 'turban', color: 0xd83a2a }, { type: 'garland' }] }),
  person('granny', 1, 'Female_Peasant', ['Hair_Buns'], { acc: [{ type: 'glasses' }, { type: 'bindi' }], scale: 0.92 }),
  person('uncle', 0, 'Male_Peasant', ['Hair_Buzzed'], { bulk: 1.25, acc: [{ type: 'moustache' }] }),
  person('influencer', 1, 'Female_Peasant', ['Hair_Long'], { weapon: phone }),
  person('detective', 1, 'Female_Ranger', ['Hair_Buns'], { acc: [{ type: 'glasses' }], hats: [{ file: 'uacp/OldClassy_Male.fbx', mats: { Hat: 1842208 }, depth: 0.2, width: 0.2, sink: 0.035 }] }),
  person('fan', 0, 'Male_Peasant', ['Hair_Buzzed'], { acc: [{ type: 'cap', color: 0x2a5ad8 }] }),
  person('boss', 0, 'Male_Ranger', ['Hair_SimpleParted', 'Hair_Beard'], { weapon: phone }),
  person('kid', 0, 'Male_Peasant', ['Hair_Buzzed'], { scale: 0.68, acc: [{ type: 'cap', color: 0xe8402a }] }),
  // pedestrians (crowds, lighter)
  person('pedM', 0, 'Male_Peasant', ['Hair_SimpleParted'], {}, 0.45, PED),
  person('pedF', 1, 'Female_Peasant', ['Hair_Long'], {}, 0.45, PED),
  // Splash Racer: drivers with helmets
  person('racerM', 0, 'Male_Ranger', [], { acc: [{ type: 'helmet' }] }, 0.8, RACER),
  person('racerF', 1, 'Female_Ranger', [], { acc: [{ type: 'helmet' }] }, 0.8, RACER),
];
fs.writeFileSync(new URL('./people3.json', import.meta.url), JSON.stringify(spec, null, 1));
console.log(spec.map(s => s.id).join(' '));
