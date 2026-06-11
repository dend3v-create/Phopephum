
/**
 * success-yam-data.ts
 * ฐานข้อมูลดวงยามสำเร็จ 112 ผัง (คำนวณจากสูตรตรงตามเอกสารอ้างอิง)
 * อ้างอิง: วิธีการลงดาวลอยแบบละเอียด V.2.md + การระวังในการวาง มฤตยู(๐).md
 */

export const SUCCESS_YAM_DATA: Record<string, {
  planets: Record<string, number>;
  lagnaZodiacIndex: number;
  statuses: Record<string, string>;
}> = {
  "sun-day-1": {
    "planets": {
      "0": 6,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 9,
      "7": 10,
      "8": 1,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "3": "maha-uccj"
    }
  },
  "sun-day-2": {
    "planets": {
      "0": 2,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 11,
      "7": 5,
      "8": 6,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "6": "pra",
      "7": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "sun-day-3": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 6,
      "7": 10,
      "8": 4,
      "9": 8,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "pra"
    }
  },
  "sun-day-4": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 3,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra"
    }
  },
  "sun-day-5": {
    "planets": {
      "0": 1,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 2,
      "9": 0,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "kaset",
      "7": "maha-chakr"
    }
  },
  "sun-day-6": {
    "planets": {
      "0": 4,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 6,
      "5": 11,
      "6": 4,
      "7": 4,
      "8": 4,
      "9": 10,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "racha-chok",
      "6": "nij"
    }
  },
  "sun-day-7": {
    "planets": {
      "0": 0,
      "1": 2,
      "2": 2,
      "3": 2,
      "4": 7,
      "5": 10,
      "6": 1,
      "7": 6,
      "8": 6,
      "9": 8,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "2": "kaset",
      "3": "nij",
      "4": "pra",
      "5": "kaset",
      "7": "racha-chok",
      "8": "maha-uccj"
    }
  },
  "sun-day-8": {
    "planets": {
      "0": 8,
      "1": 0,
      "2": 0,
      "3": 5,
      "4": 8,
      "5": 9,
      "6": 10,
      "7": 1,
      "8": 6,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "2": "maha-uccj",
      "3": "pra",
      "6": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "sun-night-1": {
    "planets": {
      "0": 0,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 2,
      "7": 7,
      "8": 8,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "8": "maha-chakr"
    }
  },
  "sun-night-2": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 0,
      "7": 2,
      "8": 7,
      "9": 0,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "5": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sun-night-3": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 4,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "sun-night-4": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij"
    }
  },
  "sun-night-5": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 11,
      "6": 11,
      "7": 11,
      "8": 2,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "5": "racha-chok",
      "6": "pra",
      "7": "nij"
    }
  },
  "sun-night-6": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 9,
      "5": 1,
      "6": 5,
      "7": 5,
      "8": 5,
      "9": 2,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "1": "maha-chakr",
      "5": "pra",
      "6": "kaset",
      "7": "maha-uccj",
      "8": "racha-chok"
    }
  },
  "sun-night-7": {
    "planets": {
      "0": 10,
      "1": 3,
      "2": 3,
      "3": 3,
      "4": 7,
      "5": 8,
      "6": 9,
      "7": 1,
      "8": 1,
      "9": 4,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "kaset",
      "4": "pra",
      "5": "nij"
    }
  },
  "sun-night-8": {
    "planets": {
      "0": 11,
      "1": 0,
      "2": 0,
      "3": 4,
      "4": 5,
      "5": 10,
      "6": 3,
      "7": 4,
      "8": 8,
      "9": 8,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "maha-uccj",
      "3": "maha-chakr",
      "5": "kaset",
      "8": "maha-chakr"
    }
  },
  "mon-day-1": {
    "planets": {
      "0": 3,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 3,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra"
    }
  },
  "mon-day-2": {
    "planets": {
      "0": 11,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 10,
      "7": 10,
      "8": 0,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "maha-uccj",
      "8": "nij"
    }
  },
  "mon-day-3": {
    "planets": {
      "0": 10,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 5,
      "7": 10,
      "8": 10,
      "9": 4,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj",
      "6": "kaset"
    }
  },
  "mon-day-4": {
    "planets": {
      "0": 2,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 0,
      "7": 3,
      "8": 8,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset",
      "8": "maha-chakr"
    }
  },
  "mon-day-5": {
    "planets": {
      "0": 10,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 10,
      "6": 11,
      "7": 0,
      "8": 3,
      "9": 8,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "3": "maha-uccj",
      "5": "kaset",
      "6": "pra",
      "7": "maha-chakr",
      "8": "pra"
    }
  },
  "mon-day-6": {
    "planets": {
      "0": 8,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 10,
      "5": 4,
      "6": 10,
      "7": 11,
      "8": 0,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "pra",
      "5": "pra",
      "6": "maha-uccj",
      "7": "nij",
      "8": "nij"
    }
  },
  "mon-day-7": {
    "planets": {
      "0": 11,
      "1": 3,
      "2": 4,
      "3": 5,
      "4": 11,
      "5": 3,
      "6": 7,
      "7": 1,
      "8": 2,
      "9": 6,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "3": "pra",
      "6": "maha-chakr"
    }
  },
  "mon-day-8": {
    "planets": {
      "0": 7,
      "1": 1,
      "2": 2,
      "3": 8,
      "4": 0,
      "5": 2,
      "6": 4,
      "7": 8,
      "8": 2,
      "9": 4,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "racha-chok",
      "2": "kaset",
      "3": "maha-uccj",
      "5": "maha-uccj",
      "6": "nij",
      "7": "kaset"
    }
  },
  "mon-night-1": {
    "planets": {
      "0": 11,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 4,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "mon-night-2": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij"
    }
  },
  "mon-night-3": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 7,
      "7": 7,
      "8": 10,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "maha-chakr"
    }
  },
  "mon-night-4": {
    "planets": {
      "0": 6,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 7,
      "8": 7,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj"
    }
  },
  "mon-night-5": {
    "planets": {
      "0": 0,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 9,
      "6": 10,
      "7": 11,
      "8": 3,
      "9": 6,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "6": "maha-uccj",
      "7": "nij",
      "8": "pra"
    }
  },
  "mon-night-6": {
    "planets": {
      "0": 1,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 6,
      "5": 11,
      "6": 4,
      "7": 5,
      "8": 6,
      "9": 10,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "5": "racha-chok",
      "6": "nij",
      "7": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "mon-night-7": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 5,
      "3": 6,
      "4": 11,
      "5": 1,
      "6": 3,
      "7": 8,
      "8": 9,
      "9": 2,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "3": "kaset",
      "5": "pra",
      "7": "kaset",
      "8": "kaset"
    }
  },
  "mon-night-8": {
    "planets": {
      "0": 10,
      "1": 1,
      "2": 2,
      "3": 7,
      "4": 9,
      "5": 3,
      "6": 9,
      "7": 11,
      "8": 4,
      "9": 6,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "racha-chok",
      "2": "kaset",
      "7": "nij"
    }
  },
  "tue-day-1": {
    "planets": {
      "0": 0,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 0,
      "7": 3,
      "8": 8,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset",
      "8": "maha-chakr"
    }
  },
  "tue-day-2": {
    "planets": {
      "0": 8,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 9,
      "7": 10,
      "8": 1,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "3": "maha-uccj"
    }
  },
  "tue-day-3": {
    "planets": {
      "0": 2,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 11,
      "7": 5,
      "8": 6,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "6": "pra",
      "7": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "tue-day-4": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 6,
      "7": 10,
      "8": 4,
      "9": 8,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "pra"
    }
  },
  "tue-day-5": {
    "planets": {
      "0": 9,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 3,
      "6": 5,
      "7": 7,
      "8": 11,
      "9": 6,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "6": "kaset"
    }
  },
  "tue-day-6": {
    "planets": {
      "0": 5,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 2,
      "5": 2,
      "6": 2,
      "7": 4,
      "8": 6,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "5": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "tue-day-7": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 6,
      "3": 8,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 6,
      "8": 8,
      "9": 2,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "2": "nij",
      "3": "maha-uccj",
      "5": "pra",
      "6": "pra",
      "7": "racha-chok",
      "8": "maha-chakr"
    }
  },
  "tue-day-8": {
    "planets": {
      "0": 4,
      "1": 2,
      "2": 4,
      "3": 4,
      "4": 9,
      "5": 0,
      "6": 3,
      "7": 8,
      "8": 8,
      "9": 0,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "2": "racha-chok",
      "3": "maha-chakr",
      "7": "kaset",
      "8": "maha-chakr"
    }
  },
  "tue-night-1": {
    "planets": {
      "0": 8,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 7,
      "7": 7,
      "8": 10,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "maha-chakr"
    }
  },
  "tue-night-2": {
    "planets": {
      "0": 6,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 7,
      "8": 7,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj"
    }
  },
  "tue-night-3": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 7,
      "8": 11,
      "9": 2,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "6": "pra"
    }
  },
  "tue-night-4": {
    "planets": {
      "0": 3,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 2,
      "7": 7,
      "8": 8,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "8": "maha-chakr"
    }
  },
  "tue-night-5": {
    "planets": {
      "0": 4,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 2,
      "6": 4,
      "7": 6,
      "8": 11,
      "9": 4,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "5": "maha-uccj",
      "6": "nij",
      "7": "racha-chok"
    }
  },
  "tue-night-6": {
    "planets": {
      "0": 0,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 10,
      "5": 4,
      "6": 10,
      "7": 0,
      "8": 2,
      "9": 8,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "4": "pra",
      "5": "pra",
      "6": "maha-uccj",
      "7": "maha-chakr"
    }
  },
  "tue-night-7": {
    "planets": {
      "0": 1,
      "1": 5,
      "2": 7,
      "3": 9,
      "4": 3,
      "5": 6,
      "6": 9,
      "7": 3,
      "8": 5,
      "9": 0,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "4": "racha-chok",
      "5": "maha-chakr",
      "8": "racha-chok"
    }
  },
  "tue-night-8": {
    "planets": {
      "0": 7,
      "1": 2,
      "2": 4,
      "3": 10,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 4,
      "8": 10,
      "9": 2,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "racha-chok",
      "4": "kaset",
      "5": "pra"
    }
  },
  "wed-day-1": {
    "planets": {
      "0": 11,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 6,
      "7": 10,
      "8": 4,
      "9": 8,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "pra"
    }
  },
  "wed-day-2": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 3,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra"
    }
  },
  "wed-day-3": {
    "planets": {
      "0": 11,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 10,
      "7": 10,
      "8": 0,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "maha-uccj",
      "8": "nij"
    }
  },
  "wed-day-4": {
    "planets": {
      "0": 10,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 5,
      "7": 10,
      "8": 10,
      "9": 4,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj",
      "6": "kaset"
    }
  },
  "wed-day-5": {
    "planets": {
      "0": 6,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 1,
      "6": 4,
      "7": 7,
      "8": 0,
      "9": 2,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "pra",
      "6": "nij",
      "8": "nij"
    }
  },
  "wed-day-6": {
    "planets": {
      "0": 2,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 11,
      "5": 0,
      "6": 1,
      "7": 4,
      "8": 7,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "3": "maha-uccj"
    }
  },
  "wed-day-7": {
    "planets": {
      "0": 0,
      "1": 5,
      "2": 8,
      "3": 11,
      "4": 0,
      "5": 6,
      "6": 0,
      "7": 1,
      "8": 4,
      "9": 0,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "3": "kaset",
      "5": "maha-chakr",
      "6": "kaset"
    }
  },
  "wed-day-8": {
    "planets": {
      "0": 3,
      "1": 3,
      "2": 6,
      "3": 7,
      "4": 1,
      "5": 5,
      "6": 9,
      "7": 3,
      "8": 4,
      "9": 10,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "kaset",
      "2": "nij",
      "4": "kaset"
    }
  },
  "wed-night-1": {
    "planets": {
      "0": 5,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 7,
      "8": 11,
      "9": 2,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "6": "pra"
    }
  },
  "wed-night-2": {
    "planets": {
      "0": 3,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 2,
      "7": 7,
      "8": 8,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "8": "maha-chakr"
    }
  },
  "wed-night-3": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 0,
      "7": 2,
      "8": 7,
      "9": 0,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "5": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "wed-night-4": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 4,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "wed-night-5": {
    "planets": {
      "0": 3,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 7,
      "6": 10,
      "7": 1,
      "8": 7,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "kaset",
      "6": "maha-uccj"
    }
  },
  "wed-night-6": {
    "planets": {
      "0": 9,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 2,
      "5": 2,
      "6": 2,
      "7": 5,
      "8": 8,
      "9": 4,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "5": "maha-uccj",
      "7": "maha-uccj",
      "8": "maha-chakr"
    }
  },
  "wed-night-7": {
    "planets": {
      "0": 10,
      "1": 6,
      "2": 9,
      "3": 0,
      "4": 0,
      "5": 4,
      "6": 8,
      "7": 8,
      "8": 11,
      "9": 8,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "5": "pra",
      "6": "racha-chok",
      "7": "kaset"
    }
  },
  "wed-night-8": {
    "planets": {
      "0": 4,
      "1": 3,
      "2": 6,
      "3": 6,
      "4": 10,
      "5": 11,
      "6": 0,
      "7": 4,
      "8": 4,
      "9": 10,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "kaset",
      "2": "nij",
      "3": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset"
    }
  },
  "thu-day-1": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 5,
      "7": 10,
      "8": 10,
      "9": 4,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj",
      "6": "kaset"
    }
  },
  "thu-day-2": {
    "planets": {
      "0": 2,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 0,
      "7": 3,
      "8": 8,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset",
      "8": "maha-chakr"
    }
  },
  "thu-day-3": {
    "planets": {
      "0": 8,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 9,
      "7": 10,
      "8": 1,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "3": "maha-uccj"
    }
  },
  "thu-day-4": {
    "planets": {
      "0": 2,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 11,
      "7": 5,
      "8": 6,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "6": "pra",
      "7": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "thu-day-5": {
    "planets": {
      "0": 5,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 6,
      "6": 10,
      "7": 2,
      "8": 8,
      "9": 0,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "maha-chakr",
      "6": "maha-uccj",
      "7": "pra",
      "8": "maha-chakr"
    }
  },
  "thu-day-6": {
    "planets": {
      "0": 1,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 3,
      "5": 5,
      "6": 7,
      "7": 11,
      "8": 3,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "racha-chok",
      "6": "maha-chakr",
      "7": "nij",
      "8": "pra"
    }
  },
  "thu-day-7": {
    "planets": {
      "0": 9,
      "1": 6,
      "2": 10,
      "3": 2,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 6,
      "8": 10,
      "9": 8,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij",
      "7": "racha-chok"
    }
  },
  "thu-day-8": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 8,
      "3": 10,
      "4": 10,
      "5": 3,
      "6": 8,
      "7": 8,
      "8": 10,
      "9": 6,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "4": "pra",
      "6": "racha-chok",
      "7": "kaset"
    }
  },
  "thu-night-1": {
    "planets": {
      "0": 4,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 0,
      "7": 2,
      "8": 7,
      "9": 0,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "5": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "thu-night-2": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 4,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "thu-night-3": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij"
    }
  },
  "thu-night-4": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 7,
      "7": 7,
      "8": 10,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "maha-chakr"
    }
  },
  "thu-night-5": {
    "planets": {
      "0": 0,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 5,
      "6": 9,
      "7": 1,
      "8": 1,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset"
    }
  },
  "thu-night-6": {
    "planets": {
      "0": 6,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 11,
      "5": 0,
      "6": 1,
      "7": 5,
      "8": 9,
      "9": 0,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "kaset",
      "7": "maha-uccj",
      "8": "kaset"
    }
  },
  "thu-night-7": {
    "planets": {
      "0": 7,
      "1": 0,
      "2": 4,
      "3": 8,
      "4": 9,
      "5": 2,
      "6": 7,
      "7": 8,
      "8": 0,
      "9": 4,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "racha-chok",
      "3": "maha-uccj",
      "5": "maha-uccj",
      "6": "maha-chakr",
      "7": "kaset",
      "8": "nij"
    }
  },
  "thu-night-8": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 8,
      "3": 9,
      "4": 2,
      "5": 4,
      "6": 6,
      "7": 11,
      "8": 0,
      "9": 8,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "pra",
      "5": "pra",
      "6": "pra",
      "7": "nij",
      "8": "nij"
    }
  },
  "fri-day-1": {
    "planets": {
      "0": 7,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 11,
      "7": 5,
      "8": 6,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "6": "pra",
      "7": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "fri-day-2": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 6,
      "7": 10,
      "8": 4,
      "9": 8,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "pra"
    }
  },
  "fri-day-3": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 3,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra"
    }
  },
  "fri-day-4": {
    "planets": {
      "0": 11,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 10,
      "7": 10,
      "8": 0,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "maha-uccj",
      "8": "nij"
    }
  },
  "fri-day-5": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 4,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 8,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "pra",
      "7": "pra"
    }
  },
  "fri-day-6": {
    "planets": {
      "0": 10,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 0,
      "5": 3,
      "6": 6,
      "7": 11,
      "8": 4,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "kaset",
      "6": "pra",
      "7": "nij"
    }
  },
  "fri-day-7": {
    "planets": {
      "0": 6,
      "1": 0,
      "2": 5,
      "3": 10,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 6,
      "8": 11,
      "9": 4,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "4": "kaset",
      "5": "maha-uccj",
      "7": "racha-chok"
    }
  },
  "fri-day-8": {
    "planets": {
      "0": 4,
      "1": 5,
      "2": 10,
      "3": 1,
      "4": 2,
      "5": 8,
      "6": 2,
      "7": 3,
      "8": 6,
      "9": 4,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "nij",
      "5": "nij",
      "8": "maha-uccj"
    }
  },
  "fri-night-1": {
    "planets": {
      "0": 1,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij"
    }
  },
  "fri-night-2": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 7,
      "7": 7,
      "8": 10,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "maha-chakr"
    }
  },
  "fri-night-3": {
    "planets": {
      "0": 6,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 7,
      "8": 7,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj"
    }
  },
  "fri-night-4": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 7,
      "8": 11,
      "9": 2,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "6": "pra"
    }
  },
  "fri-night-5": {
    "planets": {
      "0": 9,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 3,
      "6": 8,
      "7": 1,
      "8": 2,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "6": "racha-chok"
    }
  },
  "fri-night-6": {
    "planets": {
      "0": 10,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 3,
      "5": 5,
      "6": 7,
      "7": 0,
      "8": 5,
      "9": 10,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "4": "racha-chok",
      "6": "maha-chakr",
      "7": "maha-chakr",
      "8": "racha-chok"
    }
  },
  "fri-night-7": {
    "planets": {
      "0": 6,
      "1": 1,
      "2": 6,
      "3": 11,
      "4": 1,
      "5": 7,
      "6": 1,
      "7": 3,
      "8": 8,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "kaset",
      "4": "kaset",
      "5": "kaset",
      "8": "maha-chakr"
    }
  },
  "fri-night-8": {
    "planets": {
      "0": 7,
      "1": 5,
      "2": 10,
      "3": 0,
      "4": 6,
      "5": 9,
      "6": 0,
      "7": 6,
      "8": 8,
      "9": 6,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "nij",
      "3": "racha-chok",
      "6": "kaset",
      "7": "racha-chok",
      "8": "maha-chakr"
    }
  },
  "sat-day-1": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 10,
      "7": 10,
      "8": 0,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "maha-uccj",
      "8": "nij"
    }
  },
  "sat-day-2": {
    "planets": {
      "0": 10,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 5,
      "7": 10,
      "8": 10,
      "9": 4,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj",
      "6": "kaset"
    }
  },
  "sat-day-3": {
    "planets": {
      "0": 2,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 0,
      "7": 3,
      "8": 8,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset",
      "8": "maha-chakr"
    }
  },
  "sat-day-4": {
    "planets": {
      "0": 8,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 9,
      "7": 10,
      "8": 1,
      "9": 6,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "3": "maha-uccj"
    }
  },
  "sat-day-5": {
    "planets": {
      "0": 6,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 9,
      "6": 3,
      "7": 9,
      "8": 10,
      "9": 6,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok"
    }
  },
  "sat-day-6": {
    "planets": {
      "0": 9,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 4,
      "5": 8,
      "6": 0,
      "7": 6,
      "8": 0,
      "9": 4,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "4": "maha-uccj",
      "5": "nij",
      "6": "kaset",
      "7": "racha-chok",
      "8": "nij"
    }
  },
  "sat-day-7": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 7,
      "3": 1,
      "4": 5,
      "5": 7,
      "6": 9,
      "7": 1,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "5": "kaset"
    }
  },
  "sat-day-8": {
    "planets": {
      "0": 1,
      "1": 6,
      "2": 0,
      "3": 4,
      "4": 6,
      "5": 6,
      "6": 6,
      "7": 8,
      "8": 0,
      "9": 0,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "1": "maha-chakr",
      "2": "maha-uccj",
      "3": "maha-chakr",
      "5": "maha-chakr",
      "6": "pra",
      "7": "kaset",
      "8": "nij"
    }
  },
  "sat-night-1": {
    "planets": {
      "0": 10,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 3,
      "7": 7,
      "8": 7,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj"
    }
  },
  "sat-night-2": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 7,
      "8": 11,
      "9": 2,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "6": "pra"
    }
  },
  "sat-night-3": {
    "planets": {
      "0": 3,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 2,
      "7": 7,
      "8": 8,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "8": "maha-chakr"
    }
  },
  "sat-night-4": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 0,
      "7": 2,
      "8": 7,
      "9": 0,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "5": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sat-night-5": {
    "planets": {
      "0": 8,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 8,
      "6": 2,
      "7": 8,
      "8": 10,
      "9": 4,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "5": "nij",
      "7": "kaset"
    }
  },
  "sat-night-6": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 7,
      "5": 10,
      "6": 1,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "pra",
      "5": "kaset"
    }
  },
  "sat-night-7": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 8,
      "3": 2,
      "4": 5,
      "5": 5,
      "6": 5,
      "7": 8,
      "8": 2,
      "9": 10,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "pra",
      "3": "nij",
      "6": "kaset",
      "7": "kaset"
    }
  },
  "sat-night-8": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 0,
      "3": 3,
      "4": 3,
      "5": 7,
      "6": 11,
      "7": 11,
      "8": 2,
      "9": 2,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "1": "maha-chakr",
      "2": "maha-uccj",
      "4": "racha-chok",
      "5": "kaset",
      "6": "pra",
      "7": "nij"
    }
  }
};
