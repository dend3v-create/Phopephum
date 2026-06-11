import re
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ZODIAC_CCW = ['พฤษภ','เมถุน','กรกฎ','สิงห์','กันย์','ตุลย์','พิจิก','ธนู','มังกร','กุมภ์','มีน','เมษ']
BHAVA_ORDER = ['ตนุ','กดุมภะ','สหัชชะ','พันธุ','ปุตตะ','อริ','ปัตนิ','มรณะ','ศุภะ','กัมมะ','ลาภะ','วินาศ']

with open('packages/engine/src/hora-thai-nu/datasets/success-yam-data.ts', encoding='utf-8') as f:
    content = f.read()

def check_yam(chart_id, expected_note=""):
    pat = r'"' + chart_id + r'":\s*\{[^{]+"planets":\s*\{([^}]+)\},\s*"lagnaZodiacIndex":\s*(\d+)'
    m = re.search(pat, content)
    if not m:
        print(chart_id, ": not found")
        return
    lagna = int(m.group(2))
    planets = {}
    for pm in re.findall(r'"([^"]+)":\s*(\d+)', m.group(1)):
        planets[pm[0]] = int(pm[1])
    print(f"\n=== {chart_id} ===")
    print(f"  lagna: {lagna} = {ZODIAC_CCW[lagna]}")
    print(f"  {expected_note}")
    for k in ['1','2','3','4','5','6','7','8','la','9','0']:
        if k in planets:
            idx = planets[k]
            bhava_offset = (idx - lagna) % 12
            bhava = BHAVA_ORDER[bhava_offset]
            print(f"  planet {k}: idx={idx} ({ZODIAC_CCW[idx]}) - bhava: {bhava}")

# Test case 1: Wednesday Yam 4 (well-documented in reference)
check_yam("wed-day-4", "Expected: 1=กันย์, 2=พิจิก, 3=พิจิก, 4=เมษ, 5=กรกฎ, 6=ตุลย์, 7=มีน, 8=มีน, la=พฤษภ, 9=กันย์, 0=มีน")

# Test case 2: Thursday Yam 8 (from textbook scan)
# textbook positions (bhava): 1=พันธุ, 2=กดุมภะ, 3=กดุมภะ, 4=ปุตตะ, 5=ลาภะ, 6=สหัชชะ, 7=กัมมะ
# top house = ปัตนิ (lagna's 7th = ปัตนิ means lagna = ตนุ = 1st house)
check_yam("thu-day-8", "Textbook: 1=พันธุ, 2=กดุมภะ, 3=กดุมภะ, 4=ปุตตะ, 5=ลาภะ, 6=สหัชชะ, 7=กัมมะ, top_house=ปัตนิ")
