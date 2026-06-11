import json

MAHA_UCH = {1:11, 2:0, 3:8, 4:4, 5:2, 6:10, 7:5}
RAJA_CHOK = {1:1, 2:4, 3:0, 4:3, 5:11, 6:8, 7:6}
MAHA_CHAK = {1:6, 2:11, 3:4, 4:3, 5:6, 6:7, 7:0}
NID = {1:5, 2:6, 3:2, 4:10, 5:8, 6:4, 7:11}
KASTERN_FIXED = {0:6, 1:4, 2:2, 3:1, 4:4, 5:6, 6:3, 7:5, 8:7, 9:8, 10:5, 11:3}

kaset_z = {}
for z, p in KASTERN_FIXED.items():
    if p not in kaset_z:
        kaset_z[p] = []
    kaset_z[p].append(z)

pra_z = {}
for z in range(12):
    p = KASTERN_FIXED[(z+6)%12]
    if p not in pra_z:
        pra_z[p] = []
    pra_z[p].append(z)

def get_z(status, planet):
    if status == "maha_uccj": return [MAHA_UCH[planet]]
    elif status == "racha_chok": return [RAJA_CHOK[planet]]
    elif status == "maha_chakr": return [MAHA_CHAK[planet]]
    elif status == "nij": return [NID[planet]]
    elif status == "kaset": return kaset_z.get(planet, [])
    elif status == "pra": return pra_z.get(planet, [])
    return []

statuses = {
"sun-day-1": {"3":"kaset","5":"maha_uccj","6":"racha_chok"},
"sun-day-2": {"1":"racha_chok","3":"kaset","5":"kaset"},
"sun-night-1": {"2":"pra","3":"kaset","6":"racha_chok"},
"sun-night-2": {"5":"racha_chok"},
"sun-day-3": {"1":"kaset","3":"kaset","4":"maha_chakr","5":"maha_uccj"},
"sun-day-4": {"6":"maha_uccj","7":"kaset"},
"sun-night-3": {"1":"maha_uccj","3":"maha_uccj","5":"pra"},
"sun-night-4": {},
"sun-day-5": {"5":"racha_chok","6":"maha_chakr"},
"sun-day-6": {"1":"kaset","4":"maha_chakr"},
"sun-night-5": {"1":"maha_uccj","4":"racha_chok","6":"pra"},
"sun-night-6": {"1":"kaset","5":"maha_uccj"},
"sun-day-7": {"1":"kaset","2":"maha_chakr","3":"kaset","4":"racha_chok","5":"pra"},
"sun-day-8": {"3":"racha_chok","6":"kaset"},
"sun-night-7": {"1":"racha_chok","3":"kaset","5":"kaset","6":"maha_chakr"},
"sun-night-8": {"1":"maha_uccj","2":"pra","5":"kaset","7":"pra"},
"mon-day-1": {"1":"kaset","3":"pra","5":"pra","6":"maha_uccj"},
"mon-day-2": {"1":"racha_chok","5":"maha_uccj"},
"mon-night-1": {"2":"racha_chok","5":"maha_uccj","6":"kaset"},
"mon-night-2": {"1":"kaset","4":"pra","6":"kaset"},
"mon-day-3": {"1":"maha_uccj","5":"maha_uccj","6":"pra"},
"mon-day-4": {"1":"kaset","2":"maha_chakr","4":"pra","5":"pra"},
"mon-night-3": {"2":"pra","4":"maha_chakr","5":"maha_uccj","6":"pra"},
"mon-night-4": {"1":"kaset","3":"kaset","5":"pra","6":"pra"},
"mon-day-5": {"4":"kaset","5":"maha_uccj","6":"pra"},
"mon-day-6": {"3":"pra","4":"pra","5":"maha_uccj","6":"kaset"},
"mon-night-5": {"2":"kaset","5":"racha_chok","6":"kaset"},
"mon-night-6": {"2":"kaset","4":"maha_uccj","5":"pra"},
"mon-day-7": {"1":"kaset","2":"pra","3":"kaset","4":"maha_chakr","5":"pra"},
"mon-day-8": {"1":"kaset","2":"kaset","3":"pra","5":"maha_uccj","6":"pra"},
"mon-night-7": {"1":"pra","2":"pra","5":"kaset","6":"maha_uccj"},
"mon-night-8": {"1":"kaset","3":"pra","5":"maha_uccj","6":"pra","7":"pra"},
"tue-day-1": {"1":"kaset","3":"maha_uccj","4":"maha_chakr","5":"kaset"},
"tue-day-2": {"4":"maha_chakr","5":"maha_chakr","6":"racha_chok"},
"tue-night-1": {"1":"kaset","3":"kaset","4":"pra","5":"pra"},
"tue-night-2": {"1":"kaset","4":"maha_chakr","6":"kaset"},
"tue-day-3": {"2":"racha_chok","4":"pra","5":"kaset"},
"tue-day-4": {"2":"kaset","3":"pra","5":"maha_uccj","6":"pra"},
"tue-night-3": {"1":"kaset","3":"maha_uccj","4":"pra","7":"maha_chakr"},
"tue-night-4": {"1":"racha_chok","2":"pra","6":"maha_chakr"},
"tue-day-5": {"1":"kaset","3":"kaset","4":"pra","5":"pra"},
"tue-day-6": {"1":"kaset","3":"pra","4":"maha_chakr","5":"pra"},
"tue-night-5": {"3":"maha_uccj","5":"kaset","6":"racha_chok"},
"tue-night-6": {"1":"pra","3":"kaset","5":"maha_uccj","6":"maha_chakr"},
"tue-day-7": {"2":"pra","3":"maha_uccj","4":"maha_chakr","5":"racha_chok"},
"tue-day-8": {"2":"maha_uccj","3":"pra","4":"racha_chok","5":"pra"},
"tue-night-7": {"1":"pra","3":"maha_uccj","4":"maha_chakr","5":"kaset"},
"tue-night-8": {"1":"kaset","2":"maha_uccj","3":"kaset","5":"pra","7":"pra"},
"wed-day-1": {"1":"kaset","3":"maha_uccj","4":"pra","5":"pra","6":"maha_chakr"},
"wed-day-2": {"1":"kaset","3":"kaset","4":"pra","5":"maha_uccj","6":"racha_chok"},
"wed-night-1": {"1":"kaset","2":"maha_uccj","3":"kaset","4":"pra","6":"racha_chok"},
"wed-night-2": {"1":"kaset","2":"racha_chok","4":"maha_chakr","5":"pra"},
"wed-day-3": {"1":"pra","3":"pra","4":"pra","5":"kaset"},
"wed-day-4": {"2":"pra","3":"kaset","5":"racha_chok","6":"pra"},
"wed-night-3": {"2":"maha_uccj","3":"kaset","5":"pra","6":"maha_chakr"},
"wed-night-4": {"1":"pra","2":"pra","3":"kaset","5":"maha_chakr","6":"racha_chok"},
"wed-day-5": {"1":"maha_chakr","2":"maha_chakr","3":"pra","5":"pra"},
"wed-day-6": {"1":"kaset","2":"pra","3":"maha_uccj","5":"maha_chakr","6":"kaset"},
"wed-night-5": {"1":"kaset","3":"maha_uccj","4":"pra","5":"pra","6":"kaset"},
"wed-night-6": {"1":"kaset","2":"pra","4":"maha_chakr","5":"pra","6":"kaset"},
"wed-day-7": {"1":"kaset","3":"kaset","4":"pra","5":"pra","6":"pra"},
"wed-day-8": {"1":"pra","3":"kaset","4":"maha_uccj","5":"pra","6":"maha_chakr"},
"wed-night-7": {"1":"maha_uccj","3":"kaset","4":"pra","5":"pra","6":"maha_uccj"},
"wed-night-8": {"1":"kaset","2":"pra","3":"pra","4":"kaset","5":"maha_uccj"},
"thu-day-1": {"1":"maha_uccj","3":"kaset","4":"maha_chakr","5":"maha_uccj"},
"thu-day-2": {"1":"kaset","2":"maha_uccj","3":"kaset","4":"pra","5":"racha_chok"},
"thu-night-1": {"2":"maha_uccj","4":"maha_chakr","5":"kaset","7":"pra"},
"thu-night-2": {"1":"maha_uccj","2":"maha_chakr","5":"maha_uccj","6":"pra"},
"thu-day-3": {"1":"maha_uccj","3":"pra","5":"pra","6":"maha_uccj"},
"thu-day-4": {"1":"pra","3":"maha_uccj","4":"pra","5":"racha_chok","6":"pra"},
"thu-night-3": {"1":"pra","2":"pra","4":"kaset","5":"maha_uccj","6":"maha_uccj"},
"thu-night-4": {"1":"kaset","3":"maha_uccj","5":"pra","6":"pra"},
"thu-day-5": {"1":"pra","3":"kaset","4":"maha_chakr","5":"kaset"},
"thu-day-6": {"1":"pra","3":"maha_chakr","4":"kaset","5":"racha_chok","6":"maha_uccj"},
"thu-night-5": {"2":"pra","3":"kaset","4":"pra","5":"racha_chok","6":"maha_uccj"},
"thu-night-6": {"1":"pra","3":"maha_uccj","4":"maha_chakr","5":"maha_uccj","6":"kaset"},
"thu-day-7": {"1":"kaset","2":"kaset","3":"maha_uccj","4":"pra","7":"pra"},
"thu-day-8": {"1":"pra","3":"pra","4":"maha_chakr","5":"maha_uccj","6":"racha_chok"},
"thu-night-7": {"2":"racha_chok","3":"maha_uccj","4":"racha_chok","5":"kaset","6":"pra"},
"thu-night-8": {"2":"maha_uccj","3":"kaset","4":"maha_chakr","5":"kaset","7":"pra"},
"fri-day-1": {"3":"pra","5":"racha_chok","6":"kaset"},
"fri-day-2": {"1":"kaset","2":"pra","3":"pra","4":"kaset","5":"maha_uccj","6":"maha_uccj"},
"fri-night-1": {"2":"pra","3":"kaset","4":"pra","5":"maha_uccj","6":"kaset"},
"fri-night-2": {"1":"maha_chakr","2":"pra","5":"pra","6":"maha_uccj"},
"fri-day-3": {"1":"kaset","2":"maha_uccj","3":"kaset","4":"pra","5":"pra","6":"maha_uccj"},
"fri-day-4": {"1":"kaset","2":"pra","3":"maha_uccj","6":"maha_uccj"},
"fri-night-3": {"2":"kaset","4":"maha_chakr","5":"maha_uccj","6":"kaset"},
"fri-night-4": {"2":"pra","3":"pra","5":"kaset","6":"maha_uccj","7":"maha_uccj"},
"fri-day-5": {"1":"pra","2":"pra","3":"maha_uccj","4":"pra","5":"maha_uccj"},
"fri-day-6": {"1":"pra","2":"maha_uccj","3":"kaset","5":"kaset","6":"racha_chok"},
"fri-night-5": {"1":"pra","2":"kaset","3":"maha_uccj","4":"kaset","5":"pra","6":"maha_uccj"},
"fri-night-6": {"2":"kaset","3":"pra","4":"pra","5":"maha_uccj","6":"kaset"},
"fri-day-7": {"1":"maha_uccj","2":"pra","3":"kaset","4":"kaset","5":"pra"},
"fri-day-8": {"1":"pra","2":"pra","3":"kaset","5":"kaset","6":"pra"},
"fri-night-7": {"1":"pra","2":"pra","3":"kaset","4":"maha_uccj","5":"pra","7":"maha_uccj"},
"fri-night-8": {"1":"pra","2":"pra","3":"kaset","4":"pra","5":"kaset","6":"maha_uccj"},
"sat-day-1": {"1":"pra","2":"pra","3":"pra","4":"kaset","5":"kaset"},
"sat-day-2": {"1":"kaset","2":"pra","4":"pra","5":"maha_uccj","6":"maha_uccj"},
"sat-night-1": {"1":"kaset","2":"kaset","3":"maha_uccj","5":"pra","7":"maha_chakr"},
"sat-night-2": {"1":"kaset","2":"pra","3":"maha_uccj","5":"kaset","6":"pra"},
"sat-day-3": {"1":"maha_chakr","2":"maha_chakr","4":"kaset","5":"pra","6":"kaset"},
"sat-day-4": {"1":"pra","2":"kaset","4":"pra","5":"maha_uccj","6":"maha_uccj"},
"sat-night-3": {"1":"pra","2":"kaset","3":"pra","5":"maha_uccj","6":"pra"},
"sat-night-4": {"1":"pra","3":"maha_uccj","5":"kaset","6":"pra","7":"maha_chakr"},
"sat-day-5": {"1":"pra","2":"pra","3":"kaset","5":"racha_chok","6":"pra","7":"kaset"},
"sat-day-6": {"1":"kaset","2":"kaset","3":"pra","4":"pra","5":"maha_uccj","6":"kaset","7":"racha_chok"},
"sat-night-5": {"1":"pra","2":"pra","3":"kaset","4":"pra","5":"maha_uccj","6":"kaset"},
"sat-night-6": {"1":"pra","2":"pra","3":"kaset","4":"pra","5":"kaset","6":"maha_uccj"},
"sat-day-7": {"1":"pra","2":"pra","3":"pra","4":"pra","5":"kaset","6":"maha_uccj"},
"sat-day-8": {"1":"kaset","2":"kaset","3":"kaset","4":"maha_uccj","5":"kaset","6":"racha_chok","7":"pra"},
"sat-night-7": {"1":"pra","2":"pra","3":"kaset","4":"pra","5":"pra","6":"pra","7":"kaset"},
"sat-night-8": {"1":"pra","2":"pra","3":"kaset","4":"pra","5":"kaset","6":"kaset","7":"pra"},
}

print("ZODIAC POSITIONS DETERMINED BY STATUS:")
print("="*80)
for key in sorted(statuses.keys()):
    sts = statuses[key]
    results = []
    for p_str in sorted(sts.keys()):
        p = int(p_str)
        status = sts[p_str]
        zodiacs = get_z(status, p)
        results.append(f"p{p}({status})->{zodiacs}")
    if results:
        print(f"{key}: {', '.join(results)}")
    else:
        print(f"{key}: (no statuses - keep current planet positions)")
