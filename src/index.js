import "dotenv/config";
import app from "./app.js";
import connectToDB from "./db/index.js";

const PORT = process.env.PORT ?? 3000;

connectToDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Example app listening on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`MongoDB connection error: ${err}`);
    process.exit(1);
  });
