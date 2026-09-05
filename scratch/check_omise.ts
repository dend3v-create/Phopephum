import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

async function check() {
  console.log("Omise Secret Key from env:", process.env.OMISE_SECRET_KEY ? "Present" : "None");
}

check();
