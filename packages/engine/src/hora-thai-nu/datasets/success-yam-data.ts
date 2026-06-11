/**
 * success-yam-data.ts
 * ฐานข้อมูลดวงยามสำเร็จ 112 ผัง (คำนวณจากสูตรตรงตามเอกสารอ้างอิง)
 */

export const SUCCESS_YAM_DATA: Record<string, {
  planets: Record<string, number>;
  lagnaZodiacIndex: number;
  statuses: Record<string, string>;
}> = {
  "sun-day-1": {
    "planets": {
      "0": 3,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 7,
      "7": 9,
      "8": 9,
      "9": 11,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "3": "maha-uccj",
      "6": "maha-chakr",
      "8": "kaset"
    }
  },
  "sun-day-2": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 9,
      "7": 9,
      "8": 9,
      "9": 3,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "8": "kaset"
    }
  },
  "sun-day-3": {
    "planets": {
      "0": 5,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 4,
      "7": 4,
      "8": 6,
      "9": 4,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "nij",
      "8": "maha-uccj"
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
      "0": 9,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 2,
      "7": 6,
      "8": 0,
      "9": 4,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "7": "racha-chok",
      "8": "nij"
    }
  },
  "sun-day-6": {
    "planets": {
      "0": 3,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 6,
      "5": 8,
      "6": 0,
      "7": 6,
      "8": 7,
      "9": 3,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "nij",
      "6": "kaset",
      "7": "racha-chok"
    }
  },
  "sun-day-7": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 2,
      "3": 2,
      "4": 4,
      "5": 8,
      "6": 2,
      "7": 3,
      "8": 6,
      "9": 11,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "2": "kaset",
      "3": "nij",
      "4": "maha-uccj",
      "5": "nij",
      "8": "maha-uccj"
    }
  },
  "sun-day-8": {
    "planets": {
      "0": 9,
      "1": 0,
      "2": 0,
      "3": 2,
      "4": 6,
      "5": 0,
      "6": 1,
      "7": 4,
      "8": 9,
      "9": 9,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "2": "maha-uccj",
      "3": "nij",
      "8": "kaset"
    }
  },
  "sun-night-1": {
    "planets": {
      "0": 6,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 6,
      "7": 9,
      "8": 9,
      "9": 0,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "6": "pra",
      "8": "kaset"
    }
  },
  "sun-night-2": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 9,
      "7": 9,
      "8": 9,
      "9": 6,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "5": "maha-chakr",
      "8": "kaset"
    }
  },
  "sun-night-3": {
    "planets": {
      "0": 9,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 5,
      "7": 5,
      "8": 8,
      "9": 4,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "kaset",
      "7": "maha-uccj",
      "8": "maha-chakr"
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
      "0": 8,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 11,
      "6": 2,
      "7": 8,
      "8": 10,
      "9": 4,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "5": "racha-chok",
      "7": "kaset"
    }
  },
  "sun-night-6": {
    "planets": {
      "0": 6,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 9,
      "5": 0,
      "6": 6,
      "7": 8,
      "8": 1,
      "9": 6,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "6": "pra",
      "7": "kaset"
    }
  },
  "sun-night-7": {
    "planets": {
      "0": 0,
      "1": 3,
      "2": 3,
      "3": 3,
      "4": 6,
      "5": 0,
      "6": 2,
      "7": 7,
      "8": 8,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "1": "kaset",
      "8": "maha-chakr"
    }
  },
  "sun-night-8": {
    "planets": {
      "0": 9,
      "1": 0,
      "2": 0,
      "3": 3,
      "4": 9,
      "5": 11,
      "6": 4,
      "7": 5,
      "8": 9,
      "9": 9,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "2": "maha-uccj",
      "5": "racha-chok",
      "6": "nij",
      "7": "maha-uccj",
      "8": "kaset"
    }
  },
  "mon-day-1": {
    "planets": {
      "0": 7,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 6,
      "7": 9,
      "8": 10,
      "9": 2,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra",
      "6": "pra"
    }
  },
  "mon-day-2": {
    "planets": {
      "0": 6,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 8,
      "7": 9,
      "8": 10,
      "9": 6,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "racha-chok"
    }
  },
  "mon-day-3": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 3,
      "7": 4,
      "8": 7,
      "9": 0,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj"
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
      "0": 6,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 10,
      "6": 1,
      "7": 6,
      "8": 6,
      "9": 0,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "3": "maha-uccj",
      "5": "kaset",
      "7": "racha-chok",
      "8": "maha-uccj"
    }
  },
  "mon-day-6": {
    "planets": {
      "0": 7,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 10,
      "5": 1,
      "6": 6,
      "7": 6,
      "8": 8,
      "9": 6,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "pra",
      "5": "pra",
      "6": "pra",
      "7": "racha-chok",
      "8": "maha-chakr"
    }
  },
  "mon-day-7": {
    "planets": {
      "0": 3,
      "1": 3,
      "2": 4,
      "3": 5,
      "4": 8,
      "5": 1,
      "6": 1,
      "7": 3,
      "8": 7,
      "9": 2,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "3": "pra",
      "5": "pra"
    }
  },
  "mon-day-8": {
    "planets": {
      "0": 1,
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 10,
      "5": 10,
      "6": 0,
      "7": 4,
      "8": 10,
      "9": 0,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "racha-chok",
      "2": "kaset",
      "3": "pra",
      "4": "pra",
      "5": "kaset",
      "6": "kaset"
    }
  },
  "mon-night-1": {
    "planets": {
      "0": 3,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 5,
      "7": 9,
      "8": 10,
      "9": 3,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "kaset"
    }
  },
  "mon-night-2": {
    "planets": {
      "0": 5,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 8,
      "7": 9,
      "8": 10,
      "9": 2,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "racha-chok"
    }
  },
  "mon-night-3": {
    "planets": {
      "0": 6,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 4,
      "7": 5,
      "8": 9,
      "9": 0,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "nij",
      "7": "maha-uccj",
      "8": "kaset"
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
      "0": 5,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 9,
      "6": 1,
      "7": 1,
      "8": 4,
      "9": 0,
      "la": 10
    },
    "lagnaZodiacIndex": 10,
    "statuses": {
      "1": "kaset"
    }
  },
  "mon-night-6": {
    "planets": {
      "0": 3,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 6,
      "5": 10,
      "6": 10,
      "7": 1,
      "8": 7,
      "9": 2,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "5": "kaset",
      "6": "maha-uccj"
    }
  },
  "mon-night-7": {
    "planets": {
      "0": 4,
      "1": 4,
      "2": 5,
      "3": 6,
      "4": 10,
      "5": 10,
      "6": 1,
      "7": 7,
      "8": 9,
      "9": 3,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "kaset",
      "4": "pra",
      "5": "kaset",
      "8": "kaset"
    }
  },
  "mon-night-8": {
    "planets": {
      "0": 1,
      "1": 1,
      "2": 2,
      "3": 6,
      "4": 6,
      "5": 9,
      "6": 3,
      "7": 5,
      "8": 10,
      "9": 0,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "racha-chok",
      "2": "kaset",
      "3": "kaset",
      "7": "maha-uccj"
    }
  },
  "tue-day-1": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 5,
      "7": 9,
      "8": 11,
      "9": 5,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset"
    }
  },
  "tue-day-2": {
    "planets": {
      "0": 10,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 7,
      "7": 9,
      "8": 11,
      "9": 9,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "3": "maha-uccj",
      "6": "maha-chakr"
    }
  },
  "tue-day-3": {
    "planets": {
      "0": 1,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 9,
      "7": 11,
      "8": 3,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset",
      "7": "nij",
      "8": "pra"
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
      "0": 10,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 3,
      "6": 7,
      "7": 1,
      "8": 2,
      "9": 10,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "6": "maha-chakr"
    }
  },
  "tue-day-6": {
    "planets": {
      "0": 11,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 2,
      "5": 6,
      "6": 0,
      "7": 1,
      "8": 4,
      "9": 9,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "5": "maha-chakr",
      "6": "kaset"
    }
  },
  "tue-day-7": {
    "planets": {
      "0": 7,
      "1": 4,
      "2": 6,
      "3": 8,
      "4": 0,
      "5": 6,
      "6": 7,
      "7": 10,
      "8": 3,
      "9": 5,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "2": "nij",
      "3": "maha-uccj",
      "5": "maha-chakr",
      "6": "maha-chakr",
      "8": "pra"
    }
  },
  "tue-day-8": {
    "planets": {
      "0": 5,
      "1": 2,
      "2": 4,
      "3": 8,
      "4": 2,
      "5": 3,
      "6": 6,
      "7": 11,
      "8": 11,
      "9": 3,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "racha-chok",
      "3": "maha-uccj",
      "6": "pra",
      "7": "nij"
    }
  },
  "tue-night-1": {
    "planets": {
      "0": 7,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 4,
      "7": 9,
      "8": 11,
      "9": 6,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "nij"
    }
  },
  "tue-night-2": {
    "planets": {
      "0": 9,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 7,
      "7": 9,
      "8": 11,
      "9": 5,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj",
      "6": "maha-chakr"
    }
  },
  "tue-night-3": {
    "planets": {
      "0": 3,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 3,
      "7": 5,
      "8": 10,
      "9": 3,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "7": "maha-uccj"
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
      "0": 9,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 2,
      "6": 7,
      "7": 8,
      "8": 0,
      "9": 3,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "5": "maha-uccj",
      "6": "maha-chakr",
      "7": "kaset",
      "8": "nij"
    }
  },
  "tue-night-6": {
    "planets": {
      "0": 7,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 10,
      "5": 3,
      "6": 4,
      "7": 8,
      "8": 8,
      "9": 5,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "4": "pra",
      "6": "nij",
      "7": "kaset",
      "8": "maha-chakr"
    }
  },
  "tue-night-7": {
    "planets": {
      "0": 8,
      "1": 5,
      "2": 7,
      "3": 9,
      "4": 2,
      "5": 3,
      "6": 7,
      "7": 7,
      "8": 10,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "nij",
      "6": "maha-chakr"
    }
  },
  "tue-night-8": {
    "planets": {
      "0": 5,
      "1": 2,
      "2": 4,
      "3": 9,
      "4": 10,
      "5": 2,
      "6": 2,
      "7": 5,
      "8": 11,
      "9": 3,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "racha-chok",
      "4": "pra",
      "5": "maha-uccj",
      "7": "maha-uccj"
    }
  },
  "wed-day-1": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 4,
      "7": 9,
      "8": 0,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "nij",
      "8": "nij"
    }
  },
  "wed-day-2": {
    "planets": {
      "0": 7,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 6,
      "7": 9,
      "8": 0,
      "9": 5,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra",
      "6": "pra",
      "8": "nij"
    }
  },
  "wed-day-3": {
    "planets": {
      "0": 10,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 8,
      "7": 11,
      "8": 4,
      "9": 6,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "racha-chok",
      "7": "nij"
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
      "0": 7,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 1,
      "6": 6,
      "7": 6,
      "8": 8,
      "9": 6,
      "la": 0
    },
    "lagnaZodiacIndex": 0,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "pra",
      "6": "pra",
      "7": "racha-chok",
      "8": "maha-chakr"
    }
  },
  "wed-day-6": {
    "planets": {
      "0": 8,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 11,
      "5": 4,
      "6": 4,
      "7": 6,
      "8": 10,
      "9": 5,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "3": "maha-uccj",
      "5": "pra",
      "6": "nij",
      "7": "racha-chok"
    }
  },
  "wed-day-7": {
    "planets": {
      "0": 11,
      "1": 5,
      "2": 8,
      "3": 11,
      "4": 4,
      "5": 4,
      "6": 6,
      "7": 10,
      "8": 4,
      "9": 8,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "3": "kaset",
      "4": "maha-uccj",
      "5": "pra",
      "6": "pra"
    }
  },
  "wed-day-8": {
    "planets": {
      "0": 9,
      "1": 3,
      "2": 6,
      "3": 11,
      "4": 11,
      "5": 1,
      "6": 5,
      "7": 11,
      "8": 0,
      "9": 6,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "2": "nij",
      "3": "kaset",
      "5": "pra",
      "6": "kaset",
      "7": "nij",
      "8": "nij"
    }
  },
  "wed-night-1": {
    "planets": {
      "0": 11,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 3,
      "7": 9,
      "8": 0,
      "9": 9,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "8": "nij"
    }
  },
  "wed-night-2": {
    "planets": {
      "0": 1,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 6,
      "7": 9,
      "8": 0,
      "9": 8,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "6": "pra",
      "8": "nij"
    }
  },
  "wed-night-3": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 9,
      "7": 0,
      "8": 6,
      "9": 1,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "5": "maha-chakr",
      "7": "maha-chakr",
      "8": "maha-uccj"
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
      "0": 1,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 7,
      "6": 1,
      "7": 3,
      "8": 8,
      "9": 1,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "kaset",
      "8": "maha-chakr"
    }
  },
  "wed-night-6": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 2,
      "5": 8,
      "6": 10,
      "7": 3,
      "8": 4,
      "9": 8,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "5": "nij",
      "6": "maha-uccj"
    }
  },
  "wed-night-7": {
    "planets": {
      "0": 0,
      "1": 6,
      "2": 9,
      "3": 0,
      "4": 6,
      "5": 8,
      "6": 1,
      "7": 2,
      "8": 6,
      "9": 9,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "5": "nij",
      "7": "pra",
      "8": "maha-uccj"
    }
  },
  "wed-night-8": {
    "planets": {
      "0": 9,
      "1": 3,
      "2": 6,
      "3": 0,
      "4": 2,
      "5": 7,
      "6": 8,
      "7": 0,
      "8": 0,
      "9": 6,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "2": "nij",
      "3": "racha-chok",
      "5": "kaset",
      "6": "racha-chok",
      "7": "maha-chakr",
      "8": "nij"
    }
  },
  "thu-day-1": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 3,
      "7": 9,
      "8": 1,
      "9": 11,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj"
    }
  },
  "thu-day-2": {
    "planets": {
      "0": 11,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 5,
      "7": 9,
      "8": 1,
      "9": 8,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset"
    }
  },
  "thu-day-3": {
    "planets": {
      "0": 2,
      "1": 0,
      "2": 5,
      "3": 8,
      "4": 9,
      "5": 3,
      "6": 7,
      "7": 11,
      "8": 5,
      "9": 9,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "3": "maha-uccj",
      "6": "maha-chakr",
      "7": "nij",
      "8": "racha-chok"
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
      "0": 11,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 6,
      "6": 0,
      "7": 1,
      "8": 4,
      "9": 9,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "maha-chakr",
      "6": "kaset"
    }
  },
  "thu-day-6": {
    "planets": {
      "0": 0,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 3,
      "5": 9,
      "6": 10,
      "7": 1,
      "8": 6,
      "9": 8,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "racha-chok",
      "6": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "thu-day-7": {
    "planets": {
      "0": 3,
      "1": 6,
      "2": 10,
      "3": 2,
      "4": 8,
      "5": 9,
      "6": 0,
      "7": 5,
      "8": 5,
      "9": 11,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "maha-chakr",
      "3": "nij",
      "6": "kaset",
      "7": "maha-uccj",
      "8": "racha-chok"
    }
  },
  "thu-day-8": {
    "planets": {
      "0": 1,
      "1": 4,
      "2": 8,
      "3": 2,
      "4": 3,
      "5": 6,
      "6": 11,
      "7": 11,
      "8": 1,
      "9": 9,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "2": "pra",
      "3": "nij",
      "4": "racha-chok",
      "5": "maha-chakr",
      "6": "pra",
      "7": "nij"
    }
  },
  "thu-night-1": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 0,
      "5": 6,
      "6": 9,
      "7": 9,
      "8": 1,
      "9": 5,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "5": "maha-chakr"
    }
  },
  "thu-night-2": {
    "planets": {
      "0": 10,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 5,
      "6": 5,
      "7": 9,
      "8": 1,
      "9": 4,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "6": "kaset"
    }
  },
  "thu-night-3": {
    "planets": {
      "0": 11,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 8,
      "7": 0,
      "8": 0,
      "9": 9,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "racha-chok",
      "7": "maha-chakr",
      "8": "nij"
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
      "0": 10,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 5,
      "6": 5,
      "7": 8,
      "8": 2,
      "9": 9,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "6": "kaset",
      "7": "kaset"
    }
  },
  "thu-night-6": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 11,
      "5": 11,
      "6": 2,
      "7": 8,
      "8": 10,
      "9": 4,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "5": "racha-chok",
      "7": "kaset"
    }
  },
  "thu-night-7": {
    "planets": {
      "0": 9,
      "1": 0,
      "2": 4,
      "3": 8,
      "4": 8,
      "5": 11,
      "6": 5,
      "7": 7,
      "8": 0,
      "9": 5,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "racha-chok",
      "3": "maha-uccj",
      "5": "racha-chok",
      "6": "kaset",
      "8": "nij"
    }
  },
  "thu-night-8": {
    "planets": {
      "0": 1,
      "1": 4,
      "2": 8,
      "3": 8,
      "4": 11,
      "5": 5,
      "6": 7,
      "7": 0,
      "8": 1,
      "9": 9,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "2": "pra",
      "3": "maha-uccj",
      "6": "maha-chakr",
      "7": "maha-chakr"
    }
  },
  "fri-day-1": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 7,
      "6": 9,
      "7": 9,
      "8": 2,
      "9": 7,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "5": "kaset"
    }
  },
  "fri-day-2": {
    "planets": {
      "0": 8,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 2,
      "5": 4,
      "6": 4,
      "7": 9,
      "8": 2,
      "9": 4,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "5": "pra",
      "6": "nij"
    }
  },
  "fri-day-3": {
    "planets": {
      "0": 11,
      "1": 1,
      "2": 7,
      "3": 11,
      "4": 1,
      "5": 1,
      "6": 6,
      "7": 11,
      "8": 11,
      "9": 5,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "kaset",
      "5": "pra",
      "6": "pra",
      "7": "nij"
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
      "0": 8,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 4,
      "6": 4,
      "7": 6,
      "8": 10,
      "9": 5,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "pra",
      "6": "nij",
      "7": "racha-chok"
    }
  },
  "fri-day-6": {
    "planets": {
      "0": 9,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 0,
      "5": 0,
      "6": 2,
      "7": 6,
      "8": 0,
      "9": 4,
      "la": 1
    },
    "lagnaZodiacIndex": 1,
    "statuses": {
      "2": "kaset",
      "7": "racha-chok",
      "8": "nij"
    }
  },
  "fri-day-7": {
    "planets": {
      "0": 0,
      "1": 0,
      "2": 5,
      "3": 10,
      "4": 10,
      "5": 0,
      "6": 4,
      "7": 10,
      "8": 11,
      "9": 7,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "6": "nij"
    }
  },
  "fri-day-8": {
    "planets": {
      "0": 5,
      "1": 5,
      "2": 10,
      "3": 10,
      "4": 0,
      "5": 4,
      "6": 10,
      "7": 11,
      "8": 2,
      "9": 0,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "5": "pra",
      "6": "maha-uccj",
      "7": "nij"
    }
  },
  "fri-night-1": {
    "planets": {
      "0": 0,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 4,
      "5": 4,
      "6": 8,
      "7": 9,
      "8": 2,
      "9": 8,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "4": "maha-uccj",
      "5": "pra",
      "6": "racha-chok"
    }
  },
  "fri-night-2": {
    "planets": {
      "0": 7,
      "1": 2,
      "2": 8,
      "3": 11,
      "4": 11,
      "5": 3,
      "6": 4,
      "7": 9,
      "8": 2,
      "9": 7,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "2": "pra",
      "3": "kaset",
      "6": "nij"
    }
  },
  "fri-night-3": {
    "planets": {
      "0": 8,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 7,
      "7": 0,
      "8": 1,
      "9": 5,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj",
      "6": "maha-chakr",
      "7": "maha-chakr"
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
      "0": 7,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 3,
      "6": 4,
      "7": 8,
      "8": 8,
      "9": 5,
      "la": 11
    },
    "lagnaZodiacIndex": 11,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "6": "nij",
      "7": "kaset",
      "8": "maha-chakr"
    }
  },
  "fri-night-6": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 5,
      "3": 10,
      "4": 3,
      "5": 4,
      "6": 8,
      "7": 8,
      "8": 11,
      "9": 7,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "4": "racha-chok",
      "5": "pra",
      "6": "racha-chok",
      "7": "kaset"
    }
  },
  "fri-night-7": {
    "planets": {
      "0": 1,
      "1": 1,
      "2": 6,
      "3": 11,
      "4": 0,
      "5": 4,
      "6": 4,
      "7": 7,
      "8": 1,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "kaset",
      "5": "pra",
      "6": "nij"
    }
  },
  "fri-night-8": {
    "planets": {
      "0": 5,
      "1": 5,
      "2": 10,
      "3": 11,
      "4": 3,
      "5": 3,
      "6": 6,
      "7": 0,
      "8": 2,
      "9": 0,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "3": "kaset",
      "4": "racha-chok",
      "6": "pra",
      "7": "maha-chakr"
    }
  },
  "sat-day-1": {
    "planets": {
      "0": 1,
      "1": 6,
      "2": 10,
      "3": 0,
      "4": 0,
      "5": 5,
      "6": 8,
      "7": 9,
      "8": 3,
      "9": 10,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "maha-chakr",
      "3": "racha-chok",
      "6": "racha-chok",
      "8": "pra"
    }
  },
  "sat-day-2": {
    "planets": {
      "0": 0,
      "1": 4,
      "2": 6,
      "3": 6,
      "4": 11,
      "5": 2,
      "6": 3,
      "7": 9,
      "8": 3,
      "9": 7,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "2": "nij",
      "3": "kaset",
      "5": "maha-uccj",
      "8": "pra"
    }
  },
  "sat-day-3": {
    "planets": {
      "0": 8,
      "1": 2,
      "2": 2,
      "3": 7,
      "4": 10,
      "5": 11,
      "6": 5,
      "7": 11,
      "8": 0,
      "9": 8,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "2": "kaset",
      "4": "pra",
      "5": "racha-chok",
      "6": "kaset",
      "7": "nij",
      "8": "nij"
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
      "0": 0,
      "1": 5,
      "2": 8,
      "3": 9,
      "4": 3,
      "5": 9,
      "6": 10,
      "7": 1,
      "8": 6,
      "9": 8,
      "la": 6
    },
    "lagnaZodiacIndex": 6,
    "statuses": {
      "1": "nij",
      "2": "pra",
      "4": "racha-chok",
      "6": "maha-uccj",
      "8": "maha-uccj"
    }
  },
  "sat-day-6": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 4,
      "3": 10,
      "4": 4,
      "5": 5,
      "6": 8,
      "7": 1,
      "8": 1,
      "9": 7,
      "la": 3
    },
    "lagnaZodiacIndex": 3,
    "statuses": {
      "1": "kaset",
      "2": "racha-chok",
      "4": "maha-uccj",
      "6": "racha-chok"
    }
  },
  "sat-day-7": {
    "planets": {
      "0": 4,
      "1": 1,
      "2": 7,
      "3": 1,
      "4": 2,
      "5": 5,
      "6": 10,
      "7": 10,
      "8": 0,
      "9": 10,
      "la": 4
    },
    "lagnaZodiacIndex": 4,
    "statuses": {
      "1": "racha-chok",
      "6": "maha-uccj",
      "8": "nij"
    }
  },
  "sat-day-8": {
    "planets": {
      "0": 9,
      "1": 6,
      "2": 0,
      "3": 1,
      "4": 4,
      "5": 9,
      "6": 9,
      "7": 11,
      "8": 3,
      "9": 3,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "maha-chakr",
      "2": "maha-uccj",
      "4": "maha-uccj",
      "7": "nij",
      "8": "pra"
    }
  },
  "sat-night-1": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 9,
      "3": 9,
      "4": 1,
      "5": 2,
      "6": 7,
      "7": 9,
      "8": 3,
      "9": 11,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj",
      "6": "maha-chakr",
      "8": "pra"
    }
  },
  "sat-night-2": {
    "planets": {
      "0": 11,
      "1": 3,
      "2": 3,
      "3": 7,
      "4": 8,
      "5": 1,
      "6": 3,
      "7": 9,
      "8": 3,
      "9": 10,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "1": "kaset",
      "5": "pra",
      "8": "pra"
    }
  },
  "sat-night-3": {
    "planets": {
      "0": 0,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 10,
      "5": 0,
      "6": 6,
      "7": 0,
      "8": 2,
      "9": 8,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "pra",
      "6": "pra",
      "7": "maha-chakr"
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
      "0": 11,
      "1": 1,
      "2": 6,
      "3": 8,
      "4": 2,
      "5": 8,
      "6": 10,
      "7": 3,
      "8": 4,
      "9": 8,
      "la": 8
    },
    "lagnaZodiacIndex": 8,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "maha-uccj",
      "5": "nij",
      "6": "maha-uccj"
    }
  },
  "sat-night-6": {
    "planets": {
      "0": 4,
      "1": 5,
      "2": 7,
      "3": 1,
      "4": 7,
      "5": 9,
      "6": 2,
      "7": 3,
      "8": 7,
      "9": 10,
      "la": 7
    },
    "lagnaZodiacIndex": 7,
    "statuses": {
      "1": "nij",
      "4": "pra"
    }
  },
  "sat-night-7": {
    "planets": {
      "0": 5,
      "1": 2,
      "2": 8,
      "3": 2,
      "4": 4,
      "5": 9,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 11,
      "la": 5
    },
    "lagnaZodiacIndex": 5,
    "statuses": {
      "2": "pra",
      "3": "nij",
      "4": "maha-uccj",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "sat-night-8": {
    "planets": {
      "0": 9,
      "1": 6,
      "2": 0,
      "3": 2,
      "4": 7,
      "5": 8,
      "6": 0,
      "7": 0,
      "8": 3,
      "9": 3,
      "la": 9
    },
    "lagnaZodiacIndex": 9,
    "statuses": {
      "1": "maha-chakr",
      "2": "maha-uccj",
      "3": "nij",
      "4": "pra",
      "5": "nij",
      "6": "kaset",
      "7": "maha-chakr",
      "8": "pra"
    }
  }
};
