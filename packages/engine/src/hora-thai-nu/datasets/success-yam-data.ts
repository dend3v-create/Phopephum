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
      "0": 9,
      "1": 11,
      "2": 8,
      "3": 4,
      "4": 2,
      "5": 9,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "pra",
      "3": "maha-chakr",
      "6": "pra",
      "7": "pra"
    }
  },
  "sun-day-2": {
    "planets": {
      "0": 8,
      "1": 10,
      "2": 7,
      "3": 3,
      "4": 0,
      "5": 8,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "nij",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sun-day-3": {
    "planets": {
      "0": 7,
      "1": 9,
      "2": 6,
      "3": 2,
      "4": 10,
      "5": 7,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "2": "nij",
      "3": "nij",
      "4": "pra",
      "5": "kaset",
      "6": "nij",
      "7": "pra"
    }
  },
  "sun-day-4": {
    "planets": {
      "0": 6,
      "1": 8,
      "2": 5,
      "3": 1,
      "4": 8,
      "5": 6,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "maha-chakr",
      "7": "pra"
    }
  },
  "sun-day-5": {
    "planets": {
      "0": 5,
      "1": 7,
      "2": 4,
      "3": 0,
      "4": 6,
      "5": 5,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "3": "racha-chok",
      "7": "pra"
    }
  },
  "sun-day-6": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 3,
      "3": 11,
      "4": 4,
      "5": 4,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "4": "maha-uccj",
      "5": "pra",
      "7": "pra"
    }
  },
  "sun-day-7": {
    "planets": {
      "0": 3,
      "1": 5,
      "2": 2,
      "3": 10,
      "4": 2,
      "5": 3,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "2": "kaset",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sun-day-8": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 1,
      "3": 9,
      "4": 0,
      "5": 2,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "maha-uccj",
      "6": "pra",
      "7": "pra"
    }
  },
  "sun-night-1": {
    "planets": {
      "0": 7,
      "1": 9,
      "2": 8,
      "3": 2,
      "4": 9,
      "5": 7,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "2": "pra",
      "3": "nij",
      "5": "kaset",
      "6": "pra",
      "7": "pra"
    }
  },
  "sun-night-2": {
    "planets": {
      "0": 6,
      "1": 8,
      "2": 7,
      "3": 1,
      "4": 7,
      "5": 6,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "5": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sun-night-3": {
    "planets": {
      "0": 5,
      "1": 7,
      "2": 6,
      "3": 0,
      "4": 5,
      "5": 5,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "3": "racha-chok",
      "6": "nij",
      "7": "pra"
    }
  },
  "sun-night-4": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 5,
      "3": 11,
      "4": 3,
      "5": 4,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "4": "racha-chok",
      "5": "pra",
      "7": "pra"
    }
  },
  "sun-night-5": {
    "planets": {
      "0": 3,
      "1": 5,
      "2": 4,
      "3": 10,
      "4": 1,
      "5": 3,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "2": "racha-chok",
      "4": "kaset",
      "7": "pra"
    }
  },
  "sun-night-6": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 3,
      "3": 9,
      "4": 11,
      "5": 2,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "sun-night-7": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 2,
      "3": 8,
      "4": 9,
      "5": 1,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "kaset",
      "3": "maha-uccj",
      "5": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sun-night-8": {
    "planets": {
      "0": 0,
      "1": 2,
      "2": 1,
      "3": 7,
      "4": 7,
      "5": 0,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "mon-day-1": {
    "planets": {
      "0": 6,
      "1": 5,
      "2": 9,
      "3": 10,
      "4": 11,
      "5": 6,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "5": "maha-chakr",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "mon-day-2": {
    "planets": {
      "0": 5,
      "1": 4,
      "2": 8,
      "3": 9,
      "4": 9,
      "5": 5,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "mon-day-3": {
    "planets": {
      "0": 4,
      "1": 3,
      "2": 7,
      "3": 8,
      "4": 7,
      "5": 4,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "3": "maha-uccj",
      "4": "pra",
      "5": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "mon-day-4": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 6,
      "3": 7,
      "4": 5,
      "5": 3,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "6": "nij",
      "7": "pra"
    }
  },
  "mon-day-5": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 5,
      "3": 6,
      "4": 3,
      "5": 2,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "racha-chok",
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "mon-day-6": {
    "planets": {
      "0": 1,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 1,
      "5": 1,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "kaset",
      "5": "pra",
      "7": "pra"
    }
  },
  "mon-day-7": {
    "planets": {
      "0": 0,
      "1": 11,
      "2": 3,
      "3": 4,
      "4": 11,
      "5": 0,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "3": "maha-chakr",
      "7": "pra"
    }
  },
  "mon-day-8": {
    "planets": {
      "0": 11,
      "1": 10,
      "2": 2,
      "3": 3,
      "4": 9,
      "5": 11,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "kaset",
      "5": "racha-chok",
      "6": "kaset",
      "7": "pra"
    }
  },
  "mon-night-1": {
    "planets": {
      "0": 6,
      "1": 5,
      "2": 9,
      "3": 10,
      "4": 11,
      "5": 6,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "5": "maha-chakr",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "mon-night-2": {
    "planets": {
      "0": 5,
      "1": 4,
      "2": 8,
      "3": 9,
      "4": 9,
      "5": 5,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "mon-night-3": {
    "planets": {
      "0": 4,
      "1": 3,
      "2": 7,
      "3": 8,
      "4": 7,
      "5": 4,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "3": "maha-uccj",
      "4": "pra",
      "5": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "mon-night-4": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 6,
      "3": 7,
      "4": 5,
      "5": 3,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "6": "nij",
      "7": "pra"
    }
  },
  "mon-night-5": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 5,
      "3": 6,
      "4": 3,
      "5": 2,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "racha-chok",
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "mon-night-6": {
    "planets": {
      "0": 1,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 1,
      "5": 1,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "4": "kaset",
      "5": "pra",
      "7": "pra"
    }
  },
  "mon-night-7": {
    "planets": {
      "0": 0,
      "1": 11,
      "2": 3,
      "3": 4,
      "4": 11,
      "5": 0,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "3": "maha-chakr",
      "7": "pra"
    }
  },
  "mon-night-8": {
    "planets": {
      "0": 11,
      "1": 10,
      "2": 2,
      "3": 3,
      "4": 9,
      "5": 11,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "kaset",
      "5": "racha-chok",
      "6": "kaset",
      "7": "pra"
    }
  },
  "tue-day-1": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 10,
      "3": 6,
      "4": 7,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "pra",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "tue-day-2": {
    "planets": {
      "0": 4,
      "1": 0,
      "2": 9,
      "3": 5,
      "4": 5,
      "5": 4,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "5": "pra",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "tue-day-3": {
    "planets": {
      "0": 3,
      "1": 11,
      "2": 8,
      "3": 4,
      "4": 3,
      "5": 3,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "pra",
      "3": "maha-chakr",
      "4": "racha-chok",
      "6": "pra",
      "7": "pra"
    }
  },
  "tue-day-4": {
    "planets": {
      "0": 2,
      "1": 10,
      "2": 7,
      "3": 3,
      "4": 1,
      "5": 2,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "kaset",
      "5": "maha-uccj",
      "6": "kaset",
      "7": "pra"
    }
  },
  "tue-day-5": {
    "planets": {
      "0": 1,
      "1": 9,
      "2": 6,
      "3": 2,
      "4": 11,
      "5": 1,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "2": "nij",
      "3": "nij",
      "5": "pra",
      "6": "nij",
      "7": "pra"
    }
  },
  "tue-day-6": {
    "planets": {
      "0": 0,
      "1": 8,
      "2": 5,
      "3": 1,
      "4": 9,
      "5": 0,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "7": "pra"
    }
  },
  "tue-day-7": {
    "planets": {
      "0": 11,
      "1": 7,
      "2": 4,
      "3": 0,
      "4": 7,
      "5": 11,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "3": "racha-chok",
      "4": "pra",
      "5": "racha-chok",
      "7": "pra"
    }
  },
  "tue-day-8": {
    "planets": {
      "0": 10,
      "1": 6,
      "2": 3,
      "3": 11,
      "4": 5,
      "5": 10,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "5": "kaset",
      "7": "pra"
    }
  },
  "tue-night-1": {
    "planets": {
      "0": 7,
      "1": 3,
      "2": 10,
      "3": 8,
      "4": 0,
      "5": 7,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "3": "maha-uccj",
      "5": "kaset",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "tue-night-2": {
    "planets": {
      "0": 6,
      "1": 2,
      "2": 9,
      "3": 7,
      "4": 10,
      "5": 6,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "5": "maha-chakr",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "tue-night-3": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 8,
      "3": 6,
      "4": 8,
      "5": 5,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "2": "pra",
      "3": "kaset",
      "6": "pra",
      "7": "pra"
    }
  },
  "tue-night-4": {
    "planets": {
      "0": 4,
      "1": 0,
      "2": 7,
      "3": 5,
      "4": 6,
      "5": 4,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "5": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "tue-night-5": {
    "planets": {
      "0": 3,
      "1": 11,
      "2": 6,
      "3": 4,
      "4": 4,
      "5": 3,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "nij",
      "3": "maha-chakr",
      "4": "maha-uccj",
      "6": "nij",
      "7": "pra"
    }
  },
  "tue-night-6": {
    "planets": {
      "0": 2,
      "1": 10,
      "2": 5,
      "3": 3,
      "4": 2,
      "5": 2,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "tue-night-7": {
    "planets": {
      "0": 1,
      "1": 9,
      "2": 4,
      "3": 2,
      "4": 0,
      "5": 1,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "2": "racha-chok",
      "3": "nij",
      "5": "pra",
      "7": "pra"
    }
  },
  "tue-night-8": {
    "planets": {
      "0": 0,
      "1": 8,
      "2": 3,
      "3": 1,
      "4": 10,
      "5": 0,
      "6": 1,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "7": "pra"
    }
  },
  "wed-day-1": {
    "planets": {
      "0": 2,
      "1": 7,
      "2": 11,
      "3": 0,
      "4": 4,
      "5": 2,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-chakr",
      "3": "racha-chok",
      "4": "maha-uccj",
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "wed-day-2": {
    "planets": {
      "0": 1,
      "1": 6,
      "2": 10,
      "3": 11,
      "4": 2,
      "5": 1,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "5": "pra",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "wed-day-3": {
    "planets": {
      "0": 0,
      "1": 5,
      "2": 9,
      "3": 10,
      "4": 0,
      "5": 0,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "wed-day-4": {
    "planets": {
      "0": 11,
      "1": 4,
      "2": 8,
      "3": 9,
      "4": 10,
      "5": 11,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "4": "pra",
      "5": "racha-chok",
      "6": "pra",
      "7": "pra"
    }
  },
  "wed-day-5": {
    "planets": {
      "0": 10,
      "1": 3,
      "2": 7,
      "3": 8,
      "4": 8,
      "5": 10,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "3": "maha-uccj",
      "5": "kaset",
      "6": "kaset",
      "7": "pra"
    }
  },
  "wed-day-6": {
    "planets": {
      "0": 9,
      "1": 2,
      "2": 6,
      "3": 7,
      "4": 6,
      "5": 9,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "6": "nij",
      "7": "pra"
    }
  },
  "wed-day-7": {
    "planets": {
      "0": 8,
      "1": 1,
      "2": 5,
      "3": 6,
      "4": 4,
      "5": 8,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "4": "maha-uccj",
      "5": "nij",
      "7": "pra"
    }
  },
  "wed-day-8": {
    "planets": {
      "0": 7,
      "1": 0,
      "2": 4,
      "3": 5,
      "4": 2,
      "5": 7,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "3": "pra",
      "5": "kaset",
      "7": "pra"
    }
  },
  "wed-night-1": {
    "planets": {
      "0": 6,
      "1": 11,
      "2": 11,
      "3": 4,
      "4": 2,
      "5": 6,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "maha-chakr",
      "3": "maha-chakr",
      "5": "maha-chakr",
      "7": "pra"
    }
  },
  "wed-night-2": {
    "planets": {
      "0": 5,
      "1": 10,
      "2": 10,
      "3": 3,
      "4": 0,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "wed-night-3": {
    "planets": {
      "0": 4,
      "1": 9,
      "2": 9,
      "3": 2,
      "4": 10,
      "5": 4,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "3": "nij",
      "4": "pra",
      "5": "pra",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "wed-night-4": {
    "planets": {
      "0": 3,
      "1": 8,
      "2": 8,
      "3": 1,
      "4": 8,
      "5": 3,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "wed-night-5": {
    "planets": {
      "0": 2,
      "1": 7,
      "2": 7,
      "3": 0,
      "4": 6,
      "5": 2,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "racha-chok",
      "5": "maha-uccj",
      "6": "kaset",
      "7": "pra"
    }
  },
  "wed-night-6": {
    "planets": {
      "0": 1,
      "1": 6,
      "2": 6,
      "3": 11,
      "4": 4,
      "5": 1,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "2": "nij",
      "3": "kaset",
      "4": "maha-uccj",
      "5": "pra",
      "6": "nij",
      "7": "pra"
    }
  },
  "wed-night-7": {
    "planets": {
      "0": 0,
      "1": 5,
      "2": 5,
      "3": 10,
      "4": 2,
      "5": 0,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "7": "pra"
    }
  },
  "wed-night-8": {
    "planets": {
      "0": 11,
      "1": 4,
      "2": 4,
      "3": 9,
      "4": 0,
      "5": 11,
      "6": 2,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "racha-chok",
      "5": "racha-chok",
      "7": "pra"
    }
  },
  "thu-day-1": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 0,
      "3": 8,
      "4": 0,
      "5": 1,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "maha-uccj",
      "3": "maha-uccj",
      "5": "pra",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "thu-day-2": {
    "planets": {
      "0": 0,
      "1": 2,
      "2": 11,
      "3": 7,
      "4": 10,
      "5": 0,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-chakr",
      "4": "pra",
      "7": "pra"
    }
  },
  "thu-day-3": {
    "planets": {
      "0": 11,
      "1": 1,
      "2": 10,
      "3": 6,
      "4": 8,
      "5": 11,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "5": "racha-chok",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "thu-day-4": {
    "planets": {
      "0": 10,
      "1": 0,
      "2": 9,
      "3": 5,
      "4": 6,
      "5": 10,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "5": "kaset",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "thu-day-5": {
    "planets": {
      "0": 9,
      "1": 11,
      "2": 8,
      "3": 4,
      "4": 4,
      "5": 9,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "pra",
      "3": "maha-chakr",
      "4": "maha-uccj",
      "6": "pra",
      "7": "pra"
    }
  },
  "thu-day-6": {
    "planets": {
      "0": 8,
      "1": 10,
      "2": 7,
      "3": 3,
      "4": 2,
      "5": 8,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "5": "nij",
      "6": "kaset",
      "7": "pra"
    }
  },
  "thu-day-7": {
    "planets": {
      "0": 7,
      "1": 9,
      "2": 6,
      "3": 2,
      "4": 0,
      "5": 7,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "2": "nij",
      "3": "nij",
      "5": "kaset",
      "6": "nij",
      "7": "pra"
    }
  },
  "thu-day-8": {
    "planets": {
      "0": 6,
      "1": 8,
      "2": 5,
      "3": 1,
      "4": 10,
      "5": 6,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "5": "maha-chakr",
      "7": "pra"
    }
  },
  "thu-night-1": {
    "planets": {
      "0": 5,
      "1": 7,
      "2": 0,
      "3": 0,
      "4": 4,
      "5": 5,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-uccj",
      "3": "racha-chok",
      "4": "maha-uccj",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "thu-night-2": {
    "planets": {
      "0": 4,
      "1": 6,
      "2": 11,
      "3": 11,
      "4": 2,
      "5": 4,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "2": "maha-chakr",
      "3": "kaset",
      "5": "pra",
      "7": "pra"
    }
  },
  "thu-night-3": {
    "planets": {
      "0": 3,
      "1": 5,
      "2": 10,
      "3": 10,
      "4": 0,
      "5": 3,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "thu-night-4": {
    "planets": {
      "0": 2,
      "1": 4,
      "2": 9,
      "3": 9,
      "4": 10,
      "5": 2,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "pra",
      "5": "maha-uccj",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "thu-night-5": {
    "planets": {
      "0": 1,
      "1": 3,
      "2": 8,
      "3": 8,
      "4": 8,
      "5": 1,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "pra",
      "3": "maha-uccj",
      "5": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "thu-night-6": {
    "planets": {
      "0": 0,
      "1": 2,
      "2": 7,
      "3": 7,
      "4": 6,
      "5": 0,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "6": "kaset",
      "7": "pra"
    }
  },
  "thu-night-7": {
    "planets": {
      "0": 11,
      "1": 1,
      "2": 6,
      "3": 6,
      "4": 4,
      "5": 11,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "2": "nij",
      "3": "kaset",
      "4": "maha-uccj",
      "5": "racha-chok",
      "6": "nij",
      "7": "pra"
    }
  },
  "thu-night-8": {
    "planets": {
      "0": 10,
      "1": 0,
      "2": 5,
      "3": 5,
      "4": 2,
      "5": 10,
      "6": 3,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "5": "kaset",
      "7": "pra"
    }
  },
  "fri-day-1": {
    "planets": {
      "0": 10,
      "1": 9,
      "2": 1,
      "3": 2,
      "4": 9,
      "5": 10,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "3": "nij",
      "5": "kaset",
      "6": "pra",
      "7": "pra"
    }
  },
  "fri-day-2": {
    "planets": {
      "0": 9,
      "1": 8,
      "2": 0,
      "3": 1,
      "4": 7,
      "5": 9,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-uccj",
      "4": "pra",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "fri-day-3": {
    "planets": {
      "0": 8,
      "1": 7,
      "2": 11,
      "3": 0,
      "4": 5,
      "5": 8,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-chakr",
      "3": "racha-chok",
      "5": "nij",
      "7": "pra"
    }
  },
  "fri-day-4": {
    "planets": {
      "0": 7,
      "1": 6,
      "2": 10,
      "3": 11,
      "4": 3,
      "5": 7,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "4": "racha-chok",
      "5": "kaset",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "fri-day-5": {
    "planets": {
      "0": 6,
      "1": 5,
      "2": 9,
      "3": 10,
      "4": 1,
      "5": 6,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "4": "kaset",
      "5": "maha-chakr",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "fri-day-6": {
    "planets": {
      "0": 5,
      "1": 4,
      "2": 8,
      "3": 9,
      "4": 11,
      "5": 5,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "fri-day-7": {
    "planets": {
      "0": 4,
      "1": 3,
      "2": 7,
      "3": 8,
      "4": 9,
      "5": 4,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "3": "maha-uccj",
      "5": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "fri-day-8": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 6,
      "3": 7,
      "4": 7,
      "5": 3,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "4": "pra",
      "6": "nij",
      "7": "pra"
    }
  },
  "fri-night-1": {
    "planets": {
      "0": 6,
      "1": 5,
      "2": 1,
      "3": 10,
      "4": 5,
      "5": 6,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "5": "maha-chakr",
      "6": "pra",
      "7": "pra"
    }
  },
  "fri-night-2": {
    "planets": {
      "0": 5,
      "1": 4,
      "2": 0,
      "3": 9,
      "4": 3,
      "5": 5,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-uccj",
      "4": "racha-chok",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "fri-night-3": {
    "planets": {
      "0": 4,
      "1": 3,
      "2": 11,
      "3": 8,
      "4": 1,
      "5": 4,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "maha-chakr",
      "3": "maha-uccj",
      "4": "kaset",
      "5": "pra",
      "7": "pra"
    }
  },
  "fri-night-4": {
    "planets": {
      "0": 3,
      "1": 2,
      "2": 10,
      "3": 7,
      "4": 11,
      "5": 3,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "fri-night-5": {
    "planets": {
      "0": 2,
      "1": 1,
      "2": 9,
      "3": 6,
      "4": 9,
      "5": 2,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "5": "maha-uccj",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "fri-night-6": {
    "planets": {
      "0": 1,
      "1": 0,
      "2": 8,
      "3": 5,
      "4": 7,
      "5": 1,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "3": "pra",
      "4": "pra",
      "5": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "fri-night-7": {
    "planets": {
      "0": 0,
      "1": 11,
      "2": 7,
      "3": 4,
      "4": 5,
      "5": 0,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "3": "maha-chakr",
      "6": "kaset",
      "7": "pra"
    }
  },
  "fri-night-8": {
    "planets": {
      "0": 11,
      "1": 10,
      "2": 6,
      "3": 3,
      "4": 3,
      "5": 11,
      "6": 4,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "nij",
      "4": "racha-chok",
      "5": "racha-chok",
      "6": "nij",
      "7": "pra"
    }
  },
  "sat-day-1": {
    "planets": {
      "0": 9,
      "1": 5,
      "2": 2,
      "3": 10,
      "4": 5,
      "5": 9,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "nij",
      "2": "kaset",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sat-day-2": {
    "planets": {
      "0": 8,
      "1": 4,
      "2": 1,
      "3": 9,
      "4": 3,
      "5": 8,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "racha-chok",
      "5": "nij",
      "6": "pra",
      "7": "pra"
    }
  },
  "sat-day-3": {
    "planets": {
      "0": 7,
      "1": 3,
      "2": 0,
      "3": 8,
      "4": 1,
      "5": 7,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "kaset",
      "2": "maha-uccj",
      "3": "maha-uccj",
      "4": "kaset",
      "5": "kaset",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "sat-day-4": {
    "planets": {
      "0": 6,
      "1": 2,
      "2": 11,
      "3": 7,
      "4": 11,
      "5": 6,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-chakr",
      "5": "maha-chakr",
      "7": "pra"
    }
  },
  "sat-day-5": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 10,
      "3": 6,
      "4": 9,
      "5": 5,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "3": "kaset",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "sat-day-6": {
    "planets": {
      "0": 4,
      "1": 0,
      "2": 9,
      "3": 5,
      "4": 7,
      "5": 4,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "4": "pra",
      "5": "pra",
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "sat-day-7": {
    "planets": {
      "0": 3,
      "1": 11,
      "2": 8,
      "3": 4,
      "4": 5,
      "5": 3,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "pra",
      "3": "maha-chakr",
      "6": "pra",
      "7": "pra"
    }
  },
  "sat-day-8": {
    "planets": {
      "0": 2,
      "1": 10,
      "2": 7,
      "3": 3,
      "4": 3,
      "5": 2,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "4": "racha-chok",
      "5": "maha-uccj",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sat-night-1": {
    "planets": {
      "0": 5,
      "1": 1,
      "2": 2,
      "3": 6,
      "4": 7,
      "5": 5,
      "6": 0,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "racha-chok",
      "2": "kaset",
      "3": "kaset",
      "4": "pra",
      "6": "kaset",
      "7": "pra"
    }
  },
  "sat-night-2": {
    "planets": {
      "0": 4,
      "1": 0,
      "2": 1,
      "3": 5,
      "4": 5,
      "5": 4,
      "6": 11,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "3": "pra",
      "5": "pra",
      "6": "pra",
      "7": "pra"
    }
  },
  "sat-night-3": {
    "planets": {
      "0": 3,
      "1": 11,
      "2": 0,
      "3": 4,
      "4": 3,
      "5": 3,
      "6": 10,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-uccj",
      "2": "maha-uccj",
      "3": "maha-chakr",
      "4": "racha-chok",
      "6": "maha-uccj",
      "7": "pra"
    }
  },
  "sat-night-4": {
    "planets": {
      "0": 2,
      "1": 10,
      "2": 11,
      "3": 3,
      "4": 1,
      "5": 2,
      "6": 9,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "maha-chakr",
      "4": "kaset",
      "5": "maha-uccj",
      "7": "pra"
    }
  },
  "sat-night-5": {
    "planets": {
      "0": 1,
      "1": 9,
      "2": 10,
      "3": 2,
      "4": 11,
      "5": 1,
      "6": 8,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "pra",
      "3": "nij",
      "5": "pra",
      "6": "racha-chok",
      "7": "pra"
    }
  },
  "sat-night-6": {
    "planets": {
      "0": 0,
      "1": 8,
      "2": 9,
      "3": 1,
      "4": 9,
      "5": 0,
      "6": 7,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "6": "maha-chakr",
      "7": "pra"
    }
  },
  "sat-night-7": {
    "planets": {
      "0": 11,
      "1": 7,
      "2": 8,
      "3": 0,
      "4": 7,
      "5": 11,
      "6": 6,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "2": "pra",
      "3": "racha-chok",
      "4": "pra",
      "5": "racha-chok",
      "6": "pra",
      "7": "pra"
    }
  },
  "sat-night-8": {
    "planets": {
      "0": 10,
      "1": 6,
      "2": 7,
      "3": 11,
      "4": 5,
      "5": 10,
      "6": 5,
      "7": 2,
      "8": 2,
      "9": 0,
      "la": 2
    },
    "lagnaZodiacIndex": 2,
    "statuses": {
      "1": "maha-chakr",
      "3": "kaset",
      "5": "kaset",
      "6": "kaset",
      "7": "pra"
    }
  }
};
